"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Filters } from "@/components/Listings/QuickFilters";

// Map local filter format to DB ListingFilters JSONB format
function filtersToDBFormat(filters: Filters) {
  const dbFilters: Record<string, any> = {};
  if (filters.areas.length) dbFilters.area_names = filters.areas;
  if (filters.priceMin > 0) dbFilters.price_min_vnd = filters.priceMin;
  if (filters.priceMax < 100_000_000) dbFilters.price_max_vnd = filters.priceMax;
  if (filters.propertyTypes.length) dbFilters.property_types = filters.propertyTypes;
  if (filters.bedrooms !== null) dbFilters.bedrooms_min = filters.bedrooms;
  if (filters.postedWithinHours) dbFilters.posted_within_hours = filters.postedWithinHours;
  return dbFilters;
}

function describeFilters(filters: Filters) {
  const parts: string[] = [];
  if (filters.areas.length) parts.push(filters.areas.join(", "));
  if (filters.propertyTypes.length) parts.push(filters.propertyTypes.join(", "));
  if (filters.bedrooms !== null) parts.push(`${filters.bedrooms}+ BR`);
  if (filters.priceMax < 100_000_000) parts.push(`< ${(filters.priceMax / 1_000_000).toFixed(0)}M`);
  return parts.join(" / ") || "All listings";
}

interface SaveSearchModalProps {
  filters: Filters;
  isOpen: boolean;
  onClose: () => void;
}

export default function SaveSearchModal({ filters, isOpen, onClose }: SaveSearchModalProps) {
  const t = useTranslations("savedSearch");
  const { data: session } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<"instant" | "daily" | "weekly">("instant");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Not logged in — prompt to sign in
  if (!session?.user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{t("signInRequired")}</h2>
          <p className="text-sm text-gray-600 mb-4">
            {t("signInPrompt")}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/login")}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {t("signIn")}
            </button>
            <button
              onClick={onClose}
              className="flex-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg px-4 py-2"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const frequencyLabels: Record<string, string> = {
    instant: t("instant"),
    daily: t("daily"),
    weekly: t("weekly"),
  };

  async function handleSave() {
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || describeFilters(filters),
          filters: filtersToDBFormat(filters),
          alert_frequency: frequency,
          notify_email: notifyEmail,
          notify_sms: notifySms,
          notify_whatsapp: notifyWhatsapp,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t("failedToSave"));
      } else {
        onClose();
      }
    } catch {
      setError(t("error"));
    }

    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t("saveSearch")}</h2>
        <p className="text-xs text-gray-500 mb-4">{describeFilters(filters)}</p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("searchName")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={describeFilters(filters)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("alertFrequency")}
            </label>
            <div className="flex gap-2">
              {(["instant", "daily", "weekly"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`flex-1 text-sm rounded-lg px-3 py-1.5 border transition-colors ${
                    frequency === f
                      ? "bg-amber-50 border-amber-500 text-amber-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {frequencyLabels[f]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("notifyVia")}
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700">{t("email")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifySms}
                  onChange={(e) => setNotifySms(e.target.checked)}
                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700">{t("sms")}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={notifyWhatsapp}
                  onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700">{t("whatsApp")}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
          >
            {saving ? t("saving") : t("saveSearch")}
          </button>
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg px-4 py-2"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
