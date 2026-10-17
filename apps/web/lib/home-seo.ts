import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "../i18n/config";

const origin = "https://rentdanang.app";

// Describe the existing rental explorer, without unverifiable inventory claims.
const copy: Record<Locale, { title: string; description: string; socialLocale: string }> = {
  en: {
    title: "Da Nang Apartments, Houses and Villas for Rent | RentDaNang",
    description:
      "Find apartments, houses and villas for rent in Da Nang, Vietnam. Explore rental listings on a map and compare locations and monthly prices.",
    socialLocale: "en_US",
  },
  vi: {
    title: "Cho thuê căn hộ, nhà và biệt thự tại Đà Nẵng | RentDaNang",
    description:
      "Tìm căn hộ, nhà và biệt thự cho thuê tại Đà Nẵng. Xem tin cho thuê trên bản đồ, so sánh vị trí và giá thuê hàng tháng.",
    socialLocale: "vi_VN",
  },
  ko: {
    title: "다낭 아파트, 주택 및 빌라 임대 | RentDaNang",
    description:
      "베트남 다낭의 아파트, 주택 및 빌라 임대 매물을 찾아보세요. 지도에서 위치와 월 임대료를 비교할 수 있습니다.",
    socialLocale: "ko_KR",
  },
  zh: {
    title: "岘港公寓、住宅和别墅出租 | RentDaNang",
    description:
      "查找越南岘港的公寓、住宅和别墅出租信息。在地图上浏览房源，比较位置和月租价格。",
    socialLocale: "zh_CN",
  },
  ja: {
    title: "ダナンのアパート・住宅・ヴィラ賃貸 | RentDaNang",
    description:
      "ベトナム・ダナンのアパート、住宅、ヴィラの賃貸情報を探せます。地図上で物件の位置と月額家賃を比較できます。",
    socialLocale: "ja_JP",
  },
  ru: {
    title: "Аренда квартир, домов и вилл в Дананге | RentDaNang",
    description:
      "Найдите квартиры, дома и виллы в аренду в Дананге, Вьетнам. Смотрите объявления на карте, сравнивайте расположение и ежемесячную арендную плату.",
    socialLocale: "ru_RU",
  },
};

export function isHomeLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

function homeUrl(locale: Locale): string {
  return locale === defaultLocale ? origin : `${origin}/${locale}`;
}

/** Only for the six home pages; never canonicalize detail pages to the home page. */
export function getHomeMetadata(locale: Locale): Metadata {
  if (!isHomeLocale(locale)) {
    throw new RangeError("Unsupported home page locale");
  }
  const current = copy[locale];
  const url = homeUrl(locale);
  const languages: Record<string, string> = { "x-default": homeUrl(defaultLocale) };
  for (const language of locales) {
    languages[language] = homeUrl(language);
  }

  return {
    title: current.title,
    description: current.description,
    alternates: { canonical: url, languages },
    // Nested metadata is replaced, not deep-merged by Next.js. Retain image fields.
    openGraph: {
      type: "website",
      siteName: "RentDaNang",
      title: current.title,
      description: current.description,
      url,
      locale: current.socialLocale,
      alternateLocale: locales
        .filter((language) => language !== locale)
        .map((language) => copy[language].socialLocale),
      images: [{ url: `${origin}/og-default.png`, width: 1200, height: 630, alt: current.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: current.title,
      description: current.description,
      images: [{ url: `${origin}/og-default.png`, alt: current.title }],
    },
  };
}
