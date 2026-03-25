import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { GUIDES, GUIDE_CATEGORIES } from "@/lib/guide-data";
import { AREA_GUIDES } from "@/lib/area-guides-data";

export const metadata: Metadata = {
  title: "Living in Da Nang - Complete Expat Guide | RentDaNang",
  description:
    "Your complete guide to renting, living, and thriving in Vietnam's most livable city. Neighborhood guides, visa info, cost of living, and more.",
};

// ---------------------------------------------------------------------------
// Area photo mapping (guide slugs → image files)
// ---------------------------------------------------------------------------
const AREA_IMAGES: Record<string, string> = {
  "an-thuong-my-an": "/images/vietnam/area-an-thuong.jpg",
  "son-tra": "/images/vietnam/area-son-tra.jpg",
  "hai-chau": "/images/vietnam/area-hai-chau.jpg",
  "ngu-hanh-son": "/images/vietnam/area-ngu-hanh-son.jpg",
  "lien-chieu": "/images/vietnam/area-lien-chieu.jpg",
};

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------
function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const cn = className || "w-5 h-5";
  switch (icon) {
    case "star":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    case "motorbike":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "palm":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case "coins":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
  }
}

function GuideIcon({ icon, className }: { icon: string; className?: string }) {
  const cn = className || "w-5 h-5";
  switch (icon) {
    case "passport":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      );
    case "van":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8M8 17a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 104 0 2 2 0 00-4 0zM3 9h13l3 4v4H3V9zm2-4h8v4H5V5z" />
        </svg>
      );
    case "creditcard":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case "motorbike":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "waves":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6l-4.22 5.63a1 1 0 01-1.6-.01L4 6m16 0l-4.22 5.63a1 1 0 01-1.6-.01L10 6m10 6l-4.22 5.63a1 1 0 01-1.6-.01L10 12" />
        </svg>
      );
    case "smartphone":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case "calculator":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case "shield":
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    default:
      return (
        <svg className={cn} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Dot rating (replaces loading-bar-style RatingBar)
// ---------------------------------------------------------------------------
function DotRating({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-white/60">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i <= value ? "bg-amber-400" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// PAGE
// ===========================================================================
export default async function GuideHubPage() {
  const t = await getTranslations("guide");

  const ratingLabelMap: Record<string, string> = {
    walkability: t("walkability"),
    nightlife: t("nightlife"),
    englishFriendly: t("englishFriendly"),
    beachAccess: t("beachAccess"),
    localFood: t("localFood"),
  };

  function getTopRatings(ratings: Record<string, number>, count = 2) {
    return Object.entries(ratings)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([key, val]) => ({ label: ratingLabelMap[key] || key, value: val }));
  }

  const guidesByCategory = GUIDE_CATEGORIES.map((cat) => ({
    ...cat,
    guides: GUIDES.filter((g) => g.category === cat.id),
  })).filter((cat) => cat.guides.length > 0);

  return (
    <div className="min-h-screen bg-cream">
      <Header />

      {/* Hero — film photo */}
      <section className="relative h-[280px] sm:h-[320px] md:h-[380px] lg:h-[420px] overflow-hidden">
        <img
          src="/images/vietnam/hero-beach-sunset.jpg"
          alt="Beach sunset in Da Nang"
          className="absolute inset-0 w-full h-full object-cover object-[center_45%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10" />
        <div className="relative h-full flex items-end pb-10 max-w-screen-xl mx-auto px-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
              {t("livingInDaNang")}
            </h1>
            <p className="mt-3 text-white/90 max-w-2xl text-base sm:text-lg drop-shadow">
              {t("guideSubtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Neighborhood Guides — photo cards */}
      <section className="max-w-screen-xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {t("chooseNeighborhood")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {AREA_GUIDES.map((area) => {
            const topRatings = getTopRatings(area.ratings);
            const imgSrc = AREA_IMAGES[area.slug];
            return (
              <Link
                key={area.slug}
                href={`/areas/${area.slug}`}
                className="relative overflow-hidden rounded-xl h-[220px] group flex flex-col justify-end"
              >
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={area.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                <div className="relative p-4">
                  <h3 className="font-bold text-white text-lg drop-shadow-sm">
                    {area.name}
                  </h3>
                  <p className="text-sm text-white/70 mt-0.5">{area.tagline}</p>

                  <p className="text-xs text-amber-200 mt-2 font-medium">
                    1BR from {area.rentRanges.oneBr}
                  </p>

                  <div className="mt-2 flex gap-3">
                    {topRatings.map((r) => (
                      <DotRating key={r.label} label={r.label} value={r.value} />
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Practical Guides by Category */}
      <section className="max-w-screen-xl mx-auto px-4 pb-16">
        {guidesByCategory.map((cat) => (
          <div key={cat.id} className="mb-12 last:mb-0">
            <div className="flex items-center gap-2 mb-5">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: cat.color + "22", color: cat.color }}
              >
                <CategoryIcon icon={cat.icon} className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-gray-900">{cat.label}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.guides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/guide/${guide.slug}`}
                  className="bg-white rounded-xl border border-amber-100/60 p-5 hover:shadow-warm-md transition-all group flex flex-col overflow-hidden relative"
                >
                  {/* Colored accent bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ backgroundColor: guide.color }}
                  />
                  <div className="pl-2">
                    <div className="flex items-start gap-3">
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          backgroundColor: guide.color + "22",
                          color: guide.color,
                        }}
                      >
                        <GuideIcon icon={guide.icon} className="w-4.5 h-4.5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 group-hover:text-warm transition-colors">
                          {guide.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                          {guide.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 flex items-center gap-3 text-xs">
                      <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                        {guide.readTime}
                      </span>
                      <span className="text-gray-400">
                        {guide.lastUpdated}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <Footer />
    </div>
  );
}
