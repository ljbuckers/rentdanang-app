import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { AREA_GUIDES, getAreaGuide } from "@/lib/area-guides-data";
import TransportLinks from "@/components/affiliate/TransportLinks";
import AffiliateBar from "@/components/affiliate/AffiliateBar";
import LeadCaptureForm from "@/components/LeadCaptureForm";

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return AREA_GUIDES.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const area = getAreaGuide(params.slug);
  if (!area) {
    return { title: "Area Not Found | RentDaNang" };
  }
  return {
    title: `${area.name} - Living in Da Nang | RentDaNang`,
    alternates: { canonical: `https://rentdanang.app/areas/${params.slug}` },
    description: area.vibe,
  };
}

function getRatingBarColor(rating: number): string {
  if (rating >= 4) return "bg-green-500";
  if (rating === 3) return "bg-yellow-500";
  if (rating === 2) return "bg-orange-500";
  return "bg-red-500";
}

function getHighlightIcon(icon: string) {
  switch (icon) {
    case "beach":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.95 7.95l-.71-.71M4.76 4.76l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "moon":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    case "coffee": case "laptop":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "temple":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      );
    case "monkey":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      );
    case "seafood":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "dragon":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      );
    case "shopping":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      );
    case "cart":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    case "city":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case "mountain":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21l7.5-12L15 15l6-9v15H3z" />
        </svg>
      );
    case "surf":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
        </svg>
      );
    case "stone":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case "lantern":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case "road":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      );
    case "boat":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 17h18M5 17l2-8h10l2 8M12 3v6m-3-3h6" />
        </svg>
      );
    case "university":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
        </svg>
      );
    case "vegetable":
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
  }
}

export default async function AreaGuidePage({ params }: Props) {
  const area = getAreaGuide(params.slug);

  if (!area) {
    notFound();
  }

  const t = await getTranslations("guide");
  const tl = await getTranslations("listing");

  const ratingLabels: { key: keyof typeof area.ratings; label: string }[] = [
    { key: "walkability", label: t("walkability") },
    { key: "nightlife", label: t("nightlife") },
    { key: "englishFriendly", label: t("englishFriendly") },
    { key: "beachAccess", label: t("beachAccess") },
    { key: "localFood", label: t("localFood") },
  ];

  const rentTypes: { key: keyof typeof area.rentRanges; label: string }[] = [
    { key: "studio", label: tl("studio") },
    { key: "oneBr", label: t("oneBedroom") },
    { key: "twoBr", label: t("twoBedrooms") },
    ...(area.rentRanges.luxury
      ? [{ key: "luxury" as keyof typeof area.rentRanges, label: t("luxury") }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* ── Hero Section — area photo ── */}
      <section className="relative h-[260px] sm:h-[300px] md:h-[360px] lg:h-[400px] overflow-hidden">
        <img
          src={`/images/vietnam/area-${area.slug === "an-thuong-my-an" ? "an-thuong" : area.slug}.jpg`}
          alt={area.name}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10" />
        <div className="relative h-full flex flex-col justify-between max-w-screen-xl mx-auto px-4 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm font-medium transition-colors w-fit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {tl("backToMap")}
          </Link>

          <div>
            <h1 className="text-4xl font-bold text-white drop-shadow-lg">{area.name}</h1>
            <p className="text-xl text-white/80 mt-2 drop-shadow">&ldquo;{area.tagline}&rdquo;</p>
            <p className="text-white/70 mt-3 max-w-3xl leading-relaxed text-lg drop-shadow">
              {area.description}
            </p>
          </div>
        </div>
      </section>

      {/* ── Quick Stats / Rating Bars ── */}
      <section className="max-w-screen-xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("quickStats")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {ratingLabels.map(({ key, label }) => {
            const rating = area.ratings[key];
            const widthPercent = (rating / 5) * 100;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="text-sm font-semibold text-gray-900">{rating}/5</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${getRatingBarColor(rating)}`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── The Vibe ── */}
      <section className="max-w-screen-xl mx-auto px-4 pb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("theVibe")}</h2>
        <blockquote className="border-l-4 border-[#0077B6] pl-6 py-2">
          <p className="text-xl italic text-gray-700 leading-relaxed">
            {area.vibe}
          </p>
        </blockquote>
      </section>

      {/* ── Pros & Cons ── */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-screen-xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("prosCons")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border-l-4 border-green-500 pl-6">
              <h3 className="text-lg font-semibold text-green-700 mb-4">{t("pros")}</h3>
              <ul className="space-y-3">
                {area.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-l-4 border-amber-500 pl-6">
              <h3 className="text-lg font-semibold text-amber-700 mb-4">{t("cons")}</h3>
              <ul className="space-y-3">
                {area.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-gray-700">{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Rent Ranges ── */}
      <section className="max-w-screen-xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("rentRanges")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rentTypes.map(({ key, label }) => {
            const range = area.rentRanges[key];
            if (!range) return null;
            return (
              <div
                key={key}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center"
              >
                <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-gray-900">{range}</p>
                <p className="text-xs text-gray-400 mt-1">{t("perMonth")}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Best For ── */}
      <section className="max-w-screen-xl mx-auto px-4 pb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("bestFor")}</h2>
        <div className="flex flex-wrap gap-3">
          {area.bestFor.map((item, i) => (
            <span
              key={i}
              className="bg-blue-50 text-[#0077B6] px-4 py-2 rounded-full text-sm font-medium"
            >
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ── Highlights ── */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-screen-xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("highlights")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {area.highlights.map((highlight, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 text-[#0077B6] flex items-center justify-center">
                  {getHighlightIcon(highlight.icon)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{highlight.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {highlight.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Nearby Amenities ── */}
      <section className="max-w-screen-xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t("nearbyAmenities")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#0077B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m16.95 7.95l-.71-.71M4.76 4.76l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {t("beaches")}
            </h3>
            <ul className="space-y-2">
              {area.nearbyBeaches.map((beach, i) => (
                <li key={i} className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">{beach.name}</span>
                  <span className="text-gray-400 ml-1">- {beach.distance}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#0077B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t("coworking")}
            </h3>
            <ul className="space-y-2">
              {area.coworking.map((space, i) => (
                <li key={i} className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">{space.name}</span>
                  {space.price && (
                    <span className="text-gray-400 ml-1">- {space.price}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#0077B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t("restaurants")}
            </h3>
            <ul className="space-y-2">
              {area.restaurants.map((restaurant, i) => (
                <li key={i} className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">{restaurant}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#0077B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {t("groceries")}
            </h3>
            <ul className="space-y-2">
              {area.groceries.map((grocery, i) => (
                <li key={i} className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">{grocery}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Affiliate & Lead Capture ── */}
      <section className="max-w-screen-xl mx-auto px-4 py-12 space-y-8">
        {/* Affiliate widgets removed 2026-02-28: triggering Google Safe Browsing flag */}
        <LeadCaptureForm
          preferredArea={area.name}
          source={`area_${area.slug}`}
        />
      </section>

      {/* ── Bottom CTA ── */}
      <section className="bg-gradient-to-br from-[#0077B6] to-[#005A8C] py-12">
        <div className="max-w-screen-xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {t("findApartment", { area: area.name })}
          </h2>
          <p className="text-white/70 mb-6 max-w-xl mx-auto">
            {t("browseListings")}
          </p>
          <Link
            href={`/?area=${area.slug}`}
            className="inline-flex items-center gap-2 bg-white text-[#0077B6] font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {t("viewListings", { area: area.name })}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
