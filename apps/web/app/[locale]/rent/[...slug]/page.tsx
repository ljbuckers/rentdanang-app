import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListingExplorer from "@/components/ListingExplorer";
import NeighborhoodPage from "@/components/NeighborhoodPage";
import { DEFAULT_FILTERS, Filters } from "@/components/Listings/QuickFilters";
import { AREA_BOUNDARIES } from "@/lib/area-boundaries";
import { getAreaStats, getAreaMarketData } from "@/lib/stats";
import { NEIGHBORHOODS } from "@/lib/neighborhoods";

interface Props {
  params: { slug: string[] };
}

// Map URL slugs to internal filter values
const TYPE_MAP: Record<string, string> = {
  "apartments": "apartment",
  "apartment": "apartment",
  "studios": "studio",
  "studio": "studio",
  "houses": "house",
  "house": "house",
  "villas": "villa",
  "villa": "villa",
};

const AREA_MAP: Record<string, string> = {
  "son-tra": "son-tra",
  "an-thuong": "an-thuong",
  "my-an": "an-thuong",
  "hai-chau": "hai-chau",
  "ngu-hanh-son": "ngu-hanh-son",
  "lien-chieu": "lien-chieu",
  "thanh-khe": "thanh-khe",
};

function parseFilters(slugs: string[]): { filters: Filters; title: string; description: string; isNeighborhoodPage?: boolean; neighborhoodSlug?: string } | null {
  const fullSlug = slugs.join("-");
  
  // Check for neighborhood landing page match
  if (slugs.length === 1 && NEIGHBORHOODS[fullSlug]) {
  return {
      filters: { ...DEFAULT_FILTERS }, // Not used for landing page
      title: `${NEIGHBORHOODS[fullSlug].name} | RentDaNang Neighborhood Guide`,
      description: NEIGHBORHOODS[fullSlug].description,
      isNeighborhoodPage: true,
      neighborhoodSlug: fullSlug
    };
  }

  const filters: Filters = { ...DEFAULT_FILTERS };
  const parts = fullSlug.toLowerCase().split("-in-");
  
  let typePart = parts[0];
  let areaPart = parts.length > 1 ? parts[1] : null;

  // If single part matches an area, treat as area page (fallback to explorer if not a content page)
  if (!areaPart && AREA_MAP[typePart]) {
    areaPart = typePart;
    typePart = "";
  }

  // Parse Type
  let typeLabel = "Rentals";
  if (typePart) {
    const words = typePart.split("-");
    for (const word of words) {
      if (TYPE_MAP[word]) {
        const type = TYPE_MAP[word];
        filters.propertyTypes = [type];
        typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + "s";
        break;
      }
    }
  }

  // Parse Area
  let areaLabel = "Da Nang";
  if (areaPart) {
    if (AREA_MAP[areaPart]) {
      const areaSlug = AREA_MAP[areaPart];
      filters.areas = [areaSlug];
      const area = AREA_BOUNDARIES.find(a => a.slug === areaSlug);
      areaLabel = area ? area.name : (areaSlug === 'thanh-khe' ? 'Thanh Khe' : 'Da Nang');
    }
  }

  return {
    filters,
    title: `${typeLabel} for Rent in ${areaLabel} | RentDaNang`,
    description: `Find verified ${typeLabel.toLowerCase()} for rent in ${areaLabel}, Da Nang. Browse photos, check prices, and contact landlords directly.`,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = parseFilters(params.slug);
  if (!result) return {};

  return {
    title: result.title,
    description: result.description,
    alternates: {
      canonical: `https://rentdanang.app/rent/${Array.isArray(params.slug) ? params.slug.join('/') : params.slug}`,
    },
    openGraph: {
      title: result.title,
      description: result.description,
      images: result.isNeighborhoodPage && result.neighborhoodSlug 
        ? [NEIGHBORHOODS[result.neighborhoodSlug].heroImage] 
        : []
    }
  };
}

export default async function RentPage({ params }: Props) {
  const result = parseFilters(params.slug);
  
  if (!result) {
    notFound();
  }

  if (result.isNeighborhoodPage && result.neighborhoodSlug) {
    const [stats, marketData] = await Promise.all([
      getAreaStats(result.neighborhoodSlug),
      getAreaMarketData(result.neighborhoodSlug),
    ]);
    return <NeighborhoodPage stats={stats} marketData={marketData} content={NEIGHBORHOODS[result.neighborhoodSlug]} />;
  }

  return <ListingExplorer initialFilters={result.filters} />;
}
