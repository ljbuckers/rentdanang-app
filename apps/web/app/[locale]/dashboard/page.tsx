"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import ListingCard from "@/components/Listings/ListingCard";

const AREAS = [
  { name: "An Thuong / My An", slug: "an-thuong", image: "/images/vietnam/area-an-thuong.jpg" },
  { name: "Son Tra", slug: "son-tra", image: "/images/vietnam/area-son-tra.jpg" },
  { name: "Hai Chau (Downtown)", slug: "hai-chau", image: "/images/vietnam/area-hai-chau.jpg" },
  { name: "Ngu Hanh Son (Marble Mountains)", slug: "ngu-hanh-son", image: "/images/vietnam/area-ngu-hanh-son.jpg" },
  { name: "Lien Chieu (North)", slug: "lien-chieu", image: "/images/vietnam/area-lien-chieu.jpg" },
];

interface AreaStats {
  name: string;
  slug: string;
  image: string;
  count: number;
}

interface DashboardData {
  total: number;
  areaStats: AreaStats[];
  recentListings: any[];
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [totalRes, recentRes, ...areaResults] = await Promise.all([
          fetch("/api/v1/listings?per_page=1"),
          fetch("/api/v1/listings?sort=newest&per_page=6"),
          ...AREAS.map((a) =>
            fetch(`/api/v1/listings?areas=${encodeURIComponent(a.name)}&per_page=1`)
          ),
        ]);

        const totalData = await totalRes.json();
        const recentData = await recentRes.json();

        const areaStats: AreaStats[] = [];
        for (let i = 0; i < AREAS.length; i++) {
          const areaData = await areaResults[i].json();
          areaStats.push({
            ...AREAS[i],
            count: areaData.total || 0,
          });
        }

        setData({
          total: totalData.total || 0,
          areaStats,
          recentListings: recentData.listings || [],
        });
      } catch (e) {
        console.error("Failed to fetch dashboard data:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const activeAreas = data?.areaStats.filter((a) => a.count > 0).length || 0;
  const newToday = data?.recentListings.filter((l) => {
    const posted = new Date(l.first_seen_at);
    const now = new Date();
    return now.getTime() - posted.getTime() < 24 * 60 * 60 * 1000;
  }).length || 0;

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header />

      {/* Hero */}
      <div className="relative h-[240px] sm:h-[280px] md:h-[320px] lg:h-[360px] overflow-hidden flex-shrink-0">
        <img
          src="/images/vietnam/hero-pizza-pasta.jpg"
          alt="Da Nang at night"
          className="absolute inset-0 w-full h-full object-cover object-[center_60%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        <div className="relative h-full flex items-end pb-8 px-6 md:px-10 max-w-screen-lg mx-auto w-full">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white drop-shadow-lg">
              {t("title")}
            </h1>
            <p className="text-sm sm:text-base text-white/80 mt-2 drop-shadow">
              {t("subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-screen-lg mx-auto px-4 py-8 w-full">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-amber-100/60 p-5 text-center">
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mx-auto" />
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mx-auto mt-2" />
              </div>
            ))
          ) : (
            <>
              <div className="bg-white rounded-xl border border-amber-100/60 p-5 text-center" style={{ boxShadow: '0 1px 3px rgba(217,119,6,0.06)' }}>
                <p className="text-3xl font-bold text-gray-900">{data?.total || 0}</p>
                <p className="text-sm text-gray-500 mt-1">{t("activeListings")}</p>
              </div>
              <div className="bg-white rounded-xl border border-amber-100/60 p-5 text-center" style={{ boxShadow: '0 1px 3px rgba(217,119,6,0.06)' }}>
                <p className="text-3xl font-bold text-gray-900">{activeAreas}</p>
                <p className="text-sm text-gray-500 mt-1">{t("areasActive")}</p>
              </div>
              <div className="bg-white rounded-xl border border-amber-100/60 p-5 text-center" style={{ boxShadow: '0 1px 3px rgba(217,119,6,0.06)' }}>
                <p className="text-3xl font-bold text-gray-900">{newToday}</p>
                <p className="text-sm text-gray-500 mt-1">{t("newToday")}</p>
              </div>
              <div className="bg-white rounded-xl border border-amber-100/60 p-5 text-center" style={{ boxShadow: '0 1px 3px rgba(217,119,6,0.06)' }}>
                <p className="text-3xl font-bold text-amber-600">5</p>
                <p className="text-sm text-gray-500 mt-1">{t("neighborhoods")}</p>
              </div>
            </>
          )}
        </div>

        {/* Area breakdown */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t("byNeighborhood")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[120px] bg-gray-200 rounded-xl animate-pulse" />
              ))
            : data?.areaStats.map((area) => (
                <Link
                  key={area.slug}
                  href={`/?area=${area.slug}`}
                  className="relative overflow-hidden rounded-xl h-[120px] group"
                >
                  <img
                    src={area.image}
                    alt={area.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
                  <div className="relative h-full flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-bold text-white drop-shadow-sm">
                        {area.name.replace(/ \(.*\)/, "")}
                      </h3>
                      <p className="text-amber-200 text-sm mt-0.5">
                        {t("listings", { count: area.count })}
                      </p>
                    </div>
                    <span className="text-white/60 group-hover:text-white text-sm transition-colors">
                      {t("view")} &rarr;
                    </span>
                  </div>
                </Link>
              ))}
        </div>

        {/* Recent listings */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t("justListed")}</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="aspect-[16/10] bg-gray-200 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.recentListings && data.recentListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.recentListings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-amber-100/60 p-8 text-center">
            <p className="text-gray-500">{t("noRecentListings")}</p>
          </div>
        )}

        {/* Quick links */}
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4">{t("exploreDaNang")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Link
            href="/guide"
            className="bg-white rounded-xl border border-amber-100/60 p-5 hover:shadow-warm-md transition-all group"
          >
            <h3 className="font-bold text-gray-900 group-hover:text-warm transition-colors">
              {t("livingGuides")}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t("livingGuidesDesc")}
            </p>
          </Link>
          <Link
            href="/"
            className="bg-white rounded-xl border border-amber-100/60 p-5 hover:shadow-warm-md transition-all group"
          >
            <h3 className="font-bold text-gray-900 group-hover:text-warm transition-colors">
              {t("browseMap")}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t("browseMapDesc")}
            </p>
          </Link>
          <Link
            href="/guide"
            className="bg-white rounded-xl border border-amber-100/60 p-5 hover:shadow-warm-md transition-all group"
          >
            <h3 className="font-bold text-gray-900 group-hover:text-warm transition-colors">
              {t("neighborhoodsLink")}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t("neighborhoodsDesc")}
            </p>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
