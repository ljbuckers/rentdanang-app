import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { query, queryOne } from "@/lib/db";
import {
  formatPrice,
  formatPhone,
  phoneToTel,
  phoneToZalo,
  timeAgo,
  getSourceLabel,
  getSourceColor,
  getAmenityLabel,
} from "@/lib/utils";
import Footer from "@/components/Layout/Footer";
import NeighborhoodSummary from "@/components/Listings/NeighborhoodSummary";
import ShareButton from "@/components/Listings/ShareButton";
import Stay22Widget from "@/components/affiliate/Stay22Widget";
import TransportLinks from "@/components/affiliate/TransportLinks";
import AffiliateBar from "@/components/affiliate/AffiliateBar";
import LeadCaptureForm from "@/components/LeadCaptureForm";

interface Props {
  params: { id: string; locale: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await queryOne(
    `SELECT title_en, title, price_vnd, price_usd, area_sqm, bedrooms, area_name, thumbnail_url, property_type
     FROM v_properties WHERE id = $1 AND is_active = true`,
    [params.id]
  );

  if (!listing) return { title: "Listing Not Found" };

  const title =
    listing.title_en ||
    listing.title ||
    `${listing.property_type || "Property"} in ${listing.area_name || "Da Nang"}`;

  const descParts: string[] = [];
  if (listing.price_vnd) {
    const millions = listing.price_vnd / 1_000_000;
    descParts.push(`₫${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)} triệu/mo`);
  }
  if (listing.bedrooms !== null) {
    descParts.push(listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} BR`);
  }
  if (listing.area_sqm) descParts.push(`${listing.area_sqm} m²`);
  if (listing.area_name) descParts.push(listing.area_name);

  const description = descParts.length > 0
    ? `${descParts.join(" · ")} — Rental in Da Nang, Vietnam`
    : "Rental listing in Da Nang, Vietnam";

  return {
    title: `${title} | RentDaNang`,
    description,
    alternates: {
      canonical: `https://rentdanang.app/listings/${params.id}`,
    },
    openGraph: {
      title,
      description,
      images: listing.thumbnail_url ? [listing.thumbnail_url] : [],
    },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const t = await getTranslations("listing");

  const listing = await queryOne(
    `SELECT * FROM v_properties WHERE id = $1 AND is_active = true`,
    [params.id]
  );

  if (!listing) {
    notFound();
  }

  const images: string[] =
    typeof listing.images === "string"
      ? JSON.parse(listing.images)
      : listing.images || [];
  const amenities: string[] =
    typeof listing.amenities === "string"
      ? JSON.parse(listing.amenities)
      : listing.amenities || [];

  const displayTitle =
    listing.title_en ||
    listing.title ||
    t("propertyIn", {
      type: listing.property_type
        ? listing.property_type.charAt(0).toUpperCase() + listing.property_type.slice(1)
        : t("property"),
      area: listing.area_name || t("daNang"),
    });

  // Schema.org structured data for AI agents and search engines
  const schemaTypeMap: Record<string, string> = {
    apartment: "Apartment",
    studio: "Apartment",
    house: "House",
    villa: "House",
  };
  const accommodationType =
    schemaTypeMap[listing.property_type || ""] || "Accommodation";
  const priceUsd =
    listing.price_usd ||
    (listing.price_vnd ? Math.round(listing.price_vnd / 25500) : null);

  const listingJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `https://rentdanang.app/listings/${params.id}`,
    name: displayTitle,
    description: listing.description_en || listing.description || undefined,
    url: `https://rentdanang.app/listings/${params.id}`,
    datePosted: listing.first_seen_at
      ? new Date(listing.first_seen_at).toISOString()
      : undefined,
    image: images.length > 0 ? images.slice(0, 5) : undefined,
    about: {
      "@type": accommodationType,
      name: displayTitle,
      numberOfRooms:
        listing.bedrooms !== null ? listing.bedrooms : undefined,
      numberOfBathroomsTotal: listing.bathrooms || undefined,
      floorSize: listing.area_sqm
        ? {
            "@type": "QuantitativeValue",
            value: listing.area_sqm,
            unitCode: "MTK",
          }
        : undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress:
          listing.street_address || listing.building_name || undefined,
        addressLocality: listing.area_name || "Da Nang",
        addressRegion: "Da Nang",
        addressCountry: "VN",
      },
      geo:
        listing.latitude && listing.longitude
          ? {
              "@type": "GeoCoordinates",
              latitude: listing.latitude,
              longitude: listing.longitude,
            }
          : undefined,
    },
    offers:
      listing.price_vnd || priceUsd
        ? {
            "@type": "Offer",
            price: priceUsd || 0,
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          }
        : undefined,
    publisher: {
      "@type": "Organization",
      name: "RentDaNang",
      url: "https://rentdanang.app",
      "@id": "https://rentdanang.app/#organization",
    },
  };

  // Fetch source listings (other platforms listing the same property)
  const sourcesRaw = await query(
    `SELECT listing_id, source_platform, source_url, price_vnd,
            contact_name, contact_phone, first_seen_at
     FROM v_property_sources
     WHERE property_id = $1
     ORDER BY
       CASE source_platform
         WHEN 'fazwaz' THEN 1 WHEN 'dotproperty' THEN 2
         WHEN 'batdongsan' THEN 3 WHEN 'chotot' THEN 4
         WHEN 'facebook' THEN 5 ELSE 6
       END`,
    [params.id]
  );
  // Deduplicate — the "best" source is already shown as the main listing
  const otherSources = sourcesRaw.filter(
    (s: any) => s.source_platform !== listing.source_platform || s.source_url !== listing.source_url
  );

  // Fetch similar listings
  const similar = await query(
    `SELECT id, title_en, title, thumbnail_url, price_vnd, price_usd,
            bedrooms, area_sqm, area_name, source_platform, first_seen_at
     FROM v_properties
     WHERE is_active = true AND is_duplicate = false AND id != $1
       AND area_name = $2
     ORDER BY first_seen_at DESC
     LIMIT 4`,
    [params.id, listing.area_name]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
      />
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("backToMap")}
          </Link>
          <span className="text-xl font-bold text-primary">RentDaNang</span>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Mobile price bar - visible only on small screens */}
        <div className="md:hidden mb-3 bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
          <p className="text-xl font-bold text-gray-900">
            {formatPrice(listing.price_vnd, listing.price_usd)}
          </p>
          {listing.bedrooms !== null && (
            <span className="text-sm text-gray-500">
              {listing.bedrooms === 0 ? t("studio") : `${listing.bedrooms} ${t("br", { count: listing.bedrooms })}`}
              {listing.floor_area_sqm && ` · ${listing.floor_area_sqm} m²`}
            </span>
          )}
        </div>
        {/* Photo gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rounded-xl overflow-hidden">
          {images.length > 0 ? (
            <>
              <div className="aspect-[4/3] bg-gray-200">
                <img
                  src={images[0]}
                  alt={displayTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {images.slice(1, 5).map((img, i) => (
                  <div key={i} className="aspect-[4/3] bg-gray-200">
                    <img
                      src={img}
                      alt={`Photo ${i + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="aspect-[16/9] md:col-span-2 bg-gray-200 flex items-center justify-center text-gray-400">
              {t("noPhotos")}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title + meta */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-white text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: getSourceColor(listing.source_platform) }}
                >
                  {getSourceLabel(listing.source_platform)}
                </span>
                {listing.is_verified && (
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {t("verified")}
                  </span>
                )}
                <span className="text-sm text-gray-400">{timeAgo(listing.first_seen_at)}</span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">{displayTitle}</h1>
                <ShareButton />
              </div>

              {listing.area_name && (
                <address className="text-gray-500 mt-1 not-italic">
                  {listing.street_address || listing.area_name}
                  {listing.building_name && ` - ${listing.building_name}`}
                  {`, ${t("daNangVietnam")}`}
                </address>
              )}
            </div>

            {/* Price */}
            <div className="bg-white rounded-xl p-5 border border-gray-200">
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(listing.price_vnd, listing.price_usd)}
              </p>
              {listing.deposit_months && (
                <p className="text-sm text-gray-500 mt-1">
                  {t("deposit", { count: listing.deposit_months })}
                </p>
              )}
            </div>

            {/* Specs grid */}
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {listing.bedrooms !== null && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <dd className="text-2xl font-bold text-gray-900">
                    {listing.bedrooms === 0 ? t("studio") : listing.bedrooms}
                  </dd>
                  <dt className="text-xs text-gray-500 mt-1">
                    {listing.bedrooms === 0 ? t("studio") : t("bedrooms")}
                  </dt>
                </div>
              )}
              {listing.bathrooms !== null && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <dd className="text-2xl font-bold text-gray-900">
                    {listing.bathrooms}
                  </dd>
                  <dt className="text-xs text-gray-500 mt-1">{t("bathrooms")}</dt>
                </div>
              )}
              {listing.area_sqm && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <dd className="text-2xl font-bold text-gray-900">
                    {listing.area_sqm}
                  </dd>
                  <dt className="text-xs text-gray-500 mt-1">m&sup2;</dt>
                </div>
              )}
              {listing.floor_number && (
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <dd className="text-2xl font-bold text-gray-900">
                    {listing.floor_number}
                  </dd>
                  <dt className="text-xs text-gray-500 mt-1">{t("floor")}</dt>
                </div>
              )}
            </dl>

            {/* Neighborhood */}
            {listing.latitude && listing.longitude && (
              <NeighborhoodSummary
                latitude={listing.latitude}
                longitude={listing.longitude}
              />
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("amenities")}
                </h2>
                <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
                  {amenities.map((a) => (
                    <li
                      key={a}
                      className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm"
                    >
                      {getAmenityLabel(a)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description */}
            {(listing.description_en || listing.description) && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("description")}
                </h2>
                <div className="bg-white rounded-xl p-5 border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {listing.description_en || listing.description}
                  </p>
                  {listing.description_en && listing.description && listing.description !== listing.description_en && (
                    <details className="mt-4">
                      <summary className="text-sm text-primary cursor-pointer hover:underline">
                        {t("showOriginalVietnamese")}
                      </summary>
                      <p className="text-gray-500 whitespace-pre-line mt-2 text-sm">
                        {listing.description}
                      </p>
                    </details>
                  )}
                </div>
              </div>
            )}

            {/* Source attribution */}
            <div className="text-sm text-gray-500 border-t border-gray-200 pt-4">
              {t("originallyPostedOn", { source: getSourceLabel(listing.source_platform) })}
              {listing.source_url && (
                <>
                  {" "}
                  &mdash;{" "}
                  <a
                    href={listing.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {t("viewOriginal")}
                  </a>
                </>
              )}
              {listing.source_count > 1 && (
                <span className="ml-2 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                  {t("verifiedAcross", { count: listing.source_count })}
                </span>
              )}
            </div>

            {/* Also listed on — other platforms with same property */}
            {otherSources.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  {t("alsoListedOn")}
                </h2>
                <div className="space-y-2">
                  {otherSources.map((src: any) => (
                    <div key={src.listing_id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-white text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: getSourceColor(src.source_platform) }}
                        >
                          {getSourceLabel(src.source_platform)}
                        </span>
                        {src.price_vnd && (
                          <span className="text-sm text-gray-600">
                            {formatPrice(src.price_vnd, null)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {src.contact_phone && (
                          <a href={`tel:${phoneToTel(src.contact_phone)}`} className="text-xs text-primary hover:underline">
                            {formatPhone(src.contact_phone)}
                          </a>
                        )}
                        {src.source_url && (
                          <a
                            href={src.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            {t("viewOriginal")}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affiliate widgets removed 2026-02-28: triggering Google Safe Browsing flag */}

            {/* Lead capture */}
            <LeadCaptureForm
              preferredArea={listing.area_name}
              source={`listing_${params.id}`}
            />
          </div>

          {/* Sidebar: contact + map */}
          <div className="space-y-4">
            {/* Contact card */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 sticky top-20">
              <h3 className="font-semibold text-gray-900 mb-4">{t("contact")}</h3>

              {listing.contact_name && (
                <p className="text-gray-700 font-medium mb-3">
                  {listing.contact_name}
                </p>
              )}

              {listing.contact_phone && (
                <div className="space-y-2">
                  <a
                    href={`tel:${phoneToTel(listing.contact_phone)}`}
                    className="btn-primary w-full text-center block"
                  >
                    {t("call", { phone: formatPhone(listing.contact_phone) })}
                  </a>
                  <a
                    href={phoneToZalo(listing.contact_phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline w-full text-center block"
                  >
                    {t("messageOnZalo")}
                  </a>
                </div>
              )}

              {!listing.contact_phone && listing.source_url && (
                <a
                  href={listing.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary w-full text-center block"
                >
                  {t("viewOn", { source: getSourceLabel(listing.source_platform) })}
                </a>
              )}

              {/* Quick details */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                {listing.furnished && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("furnished")}</span>
                    <span className="text-gray-900 capitalize">{listing.furnished}</span>
                  </div>
                )}
                {listing.min_lease_months && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("minLease")}</span>
                    <span className="text-gray-900">{t("months", { count: listing.min_lease_months })}</span>
                  </div>
                )}
                {listing.pets_allowed !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("pets")}</span>
                    <span className="text-gray-900">
                      {listing.pets_allowed ? t("petsAllowed") : t("petsNotAllowed")}
                    </span>
                  </div>
                )}
                {listing.building_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("building")}</span>
                    <span className="text-gray-900">{listing.building_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Similar Listings */}
        {similar.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t("similarListings", { area: listing.area_name })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similar.map((item: any) => {
                const itemTitle =
                  item.title_en ||
                  item.title ||
                  t("propertyIn", { type: t("property"), area: t("daNang") });
                return (
                  <Link
                    key={item.id}
                    href={`/listings/${item.id}`}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
                  >
                    <div className="aspect-[16/10] bg-gray-100">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={itemTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0-.75 3.75m0 0-.75 3.75" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-gray-900">
                        {formatPrice(item.price_vnd, item.price_usd)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        {item.bedrooms !== null && (
                          <span>{item.bedrooms === 0 ? t("studio") : t("br", { count: item.bedrooms })}</span>
                        )}
                        {item.area_sqm && <span>{item.area_sqm} m²</span>}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">{itemTitle}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
