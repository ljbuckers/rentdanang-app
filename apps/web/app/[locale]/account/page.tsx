"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { Link } from "@/i18n/navigation";

interface SavedSearchItem {
  id: string;
  name: string | null;
  filters: any;
  alert_enabled: boolean;
  alert_frequency: string;
  notify_email: boolean;
  notify_sms: boolean;
  notify_whatsapp: boolean;
  created_at: string;
}

interface FavoriteItem {
  id: string;
  listing_id: string;
  title_en: string | null;
  price_vnd: number | null;
  area_name: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

interface UserProfile {
  name: string | null;
  email: string;
  phone: string | null;
  whatsapp_enabled: boolean;
  auth_provider: string | null;
}

export default function AccountPage() {
  const t = useTranslations("account");
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [searches, setSearches] = useState<SavedSearchItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name || "");
          setPhone(data.user.phone || "");
          setWhatsapp(data.user.whatsapp_enabled || false);
        }
      })
      .catch(() => {});
    fetch("/api/saved-searches")
      .then((r) => r.json())
      .then((data) => setSearches(data.searches || []))
      .catch(() => {});
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((data) => setFavorites(data.favorites || []))
      .catch(() => {});
  }, [session]);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, whatsapp_enabled: whatsapp }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
        setEditingProfile(false);
      }
    } catch {}
    setSaving(false);
  }

  async function handleDeleteSearch(id: string) {
    try {
      await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
      setSearches((prev) => prev.filter((s) => s.id !== id));
    } catch {}
  }

  async function handleRemoveFavorite(listingId: string) {
    try {
      await fetch(`/api/favorites?listing_id=${listingId}`, { method: "DELETE" });
      setFavorites((prev) => prev.filter((f) => f.listing_id !== listingId));
    } catch {}
  }

  function formatFilters(filters: any) {
    const parts: string[] = [];
    if (filters.area_names?.length) parts.push(filters.area_names.join(", "));
    if (filters.property_types?.length) parts.push(filters.property_types.join(", "));
    if (filters.bedrooms_min) parts.push(`${filters.bedrooms_min}+ BR`);
    if (filters.price_max_vnd) parts.push(`< ${(filters.price_max_vnd / 1_000_000).toFixed(0)}M VND`);
    return parts.join(" / ") || t("allListings");
  }

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{t("title")}</h1>

        {/* Profile Section */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{t("profile")}</h2>
            {!editingProfile && (
              <button
                onClick={() => setEditingProfile(true)}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                {t("edit")}
              </button>
            )}
          </div>

          {editingProfile ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("name")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("email")}
                </label>
                <input
                  type="email"
                  value={profile?.email || ""}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("phone")}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+84 123 456 789"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.checked)}
                  className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-gray-700">{t("enableWhatsApp")}</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
                >
                  {saving ? t("saving") : t("save")}
                </button>
                <button
                  onClick={() => setEditingProfile(false)}
                  className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">{t("name")}:</span> {profile?.name || t("notSet")}</p>
              <p><span className="text-gray-500">{t("email")}:</span> {profile?.email}</p>
              <p><span className="text-gray-500">{t("phone")}:</span> {profile?.phone || t("notSet")}</p>
              <p><span className="text-gray-500">WhatsApp:</span> {profile?.whatsapp_enabled ? t("whatsappEnabled") : t("whatsappDisabled")}</p>
              {profile?.auth_provider === "google" && (
                <p className="text-xs text-gray-400 mt-2">{t("signedInWithGoogle")}</p>
              )}
            </div>
          )}
        </section>

        {/* Saved Searches Section */}
        <section id="searches" className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("savedSearches")}</h2>
          {searches.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t("noSavedSearches")}
            </p>
          ) : (
            <div className="space-y-3">
              {searches.map((search) => (
                <div
                  key={search.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {search.name || t("unnamedSearch")}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatFilters(search.filters)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {search.alert_enabled && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {search.alert_frequency}
                        </span>
                      )}
                      {search.notify_email && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Email</span>
                      )}
                      {search.notify_sms && (
                        <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">SMS</span>
                      )}
                      {search.notify_whatsapp && (
                        <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">WhatsApp</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSearch(search.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Favorites Section */}
        <section id="favorites" className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("favorites")}</h2>
          {favorites.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t("noFavorites")}
            </p>
          ) : (
            <div className="space-y-2">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                >
                  <Link
                    href={`/listings/${fav.listing_id}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    {fav.thumbnail_url ? (
                      <img
                        src={fav.thumbnail_url}
                        alt=""
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-200 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fav.title_en || t("listing")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fav.area_name}
                        {fav.price_vnd && ` / ${(fav.price_vnd / 1_000_000).toFixed(0)}M VND`}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleRemoveFavorite(fav.listing_id)}
                    className="text-red-400 hover:text-red-600 transition-colors ml-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </>
  );
}
