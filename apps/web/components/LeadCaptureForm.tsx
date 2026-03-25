"use client";

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";

interface LeadCaptureFormProps {
  preferredArea?: string;
  source?: string;
}

const AREAS = [
  "An Thuong / My An",
  "Son Tra",
  "Hai Chau",
  "Ngu Hanh Son",
  "Lien Chieu",
];

const BUDGET_RANGES = [
  { min: 0, max: 5_000_000 },
  { min: 5_000_000, max: 10_000_000 },
  { min: 10_000_000, max: 20_000_000 },
  { min: 20_000_000, max: 100_000_000 },
];

export default function LeadCaptureForm({
  preferredArea,
  source = "website",
}: LeadCaptureFormProps) {
  const t = useTranslations("lead");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [budgetIdx, setBudgetIdx] = useState<number | null>(null);
  const [area, setArea] = useState(preferredArea || "");
  const [moveIn, setMoveIn] = useState("");

  const budgetLabels = [
    t("budgetUnder5M"),
    t("budget5to10M"),
    t("budget10to20M"),
    t("budget20Mplus"),
  ];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("sending");
    try {
      const budget = budgetIdx !== null ? BUDGET_RANGES[budgetIdx] : null;
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          budget_min: budget?.min ?? null,
          budget_max: budget?.max ?? null,
          preferred_area: area || null,
          move_in_date: moveIn || null,
          source,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-[#f4a940] rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-900">
          {t("successTitle")}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {t("successMessage")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {t("title")}
      </h3>
      <p className="text-sm text-gray-600 mb-5">
        {t("subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="lead-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("name")}
            </label>
            <input
              id="lead-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f4a940] focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="lead-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("email")} *
            </label>
            <input
              id="lead-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f4a940] focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("budget")}
          </label>
          <div className="flex flex-wrap gap-2">
            {budgetLabels.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setBudgetIdx(budgetIdx === i ? null : i)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  budgetIdx === i
                    ? "bg-[#f4a940] text-white border-[#f4a940]"
                    : "bg-white text-gray-700 border-gray-300 hover:border-[#e8734a]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="lead-area"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("preferredArea")}
            </label>
            <select
              id="lead-area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f4a940] focus:border-transparent bg-white"
            >
              <option value="">{t("anyArea")}</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
              <option value="Not sure yet">{t("notSureYet")}</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="lead-movein"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t("moveInDate")}
            </label>
            <input
              id="lead-movein"
              type="date"
              value={moveIn}
              onChange={(e) => setMoveIn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f4a940] focus:border-transparent"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full sm:w-auto px-6 py-2.5 bg-[#e8734a] text-white font-semibold rounded-lg hover:bg-[#d4603a] transition-colors disabled:opacity-60"
        >
          {status === "sending" ? t("sending") : t("send")}
        </button>

        {status === "error" && (
          <p className="text-sm text-red-600">
            {t("error")}
          </p>
        )}
      </form>
    </div>
  );
}
