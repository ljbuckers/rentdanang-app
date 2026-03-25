import Script from "next/script";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import Providers from "@/components/Providers";
import { routing } from "@/i18n/routing";
import { locales, defaultCurrencyForLocale, type Locale, type CurrencyCode } from "@/i18n/config";
import { getExchangeRates } from "@/lib/exchange-rates";
import OutboundTracker from "@/components/OutboundTracker";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL("https://rentdanang.app"),
  title: "RentDaNang — Find Rentals in Da Nang, Vietnam",
  description:
    "Search rental apartments, houses, and villas in Da Nang on an interactive map. Listings from Facebook, Airbnb, Cho Tot, and more — translated to English.",
  keywords:
    "Da Nang rental, Vietnam apartment, expat housing, Da Nang apartment, rent Da Nang, digital nomad housing",
  openGraph: {
    title: "RentDaNang — Find Rentals in Da Nang, Vietnam",
    description:
      "The easiest way to find verified apartments, houses, and villas in Da Nang. Browse listings on an interactive map.",
    url: "https://rentdanang.app",
    siteName: "RentDaNang",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "RentDaNang — Find Rentals in Da Nang, Vietnam",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RentDaNang — Find Rentals in Da Nang",
    description: "Search 6,500+ verified listings in Da Nang, Vietnam.",
    images: ["/og-default.png"],
  },
  verification: {
    google: "2KlDT-LhLEvCIxfV8uuR9omwOvJfvTwBbbDf7o2KIDE",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://rentdanang.app",

    languages: {
      en: "https://rentdanang.app",
      vi: "https://rentdanang.app/vi",
      ko: "https://rentdanang.app/ko",
      zh: "https://rentdanang.app/zh",
      ja: "https://rentdanang.app/ja",
      ru: "https://rentdanang.app/ru",
      "x-default": "https://rentdanang.app",
    },
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://rentdanang.app/#organization",
  name: "RentDaNang",
  url: "https://rentdanang.app",
  description:
    "RentDaNang aggregates rental listings across Da Nang, Vietnam from multiple platforms, translates them to English, and presents them on an interactive map for expats and digital nomads.",
  areaServed: {
    "@type": "City",
    name: "Da Nang",
    addressCountry: "VN",
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://rentdanang.app/#website",
  url: "https://rentdanang.app",
  name: "RentDaNang",
  description:
    "Find rental apartments, houses, and villas in Da Nang, Vietnam",
  publisher: { "@id": "https://rentdanang.app/#organization" },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const [messages, exchangeRates] = await Promise.all([
    getMessages(),
    getExchangeRates(),
  ]);

  const cookieStore = await cookies();
  const currencyCookie = cookieStore.get("currency")?.value as CurrencyCode | undefined;
  const initialCurrency =
    currencyCookie || defaultCurrencyForLocale[locale as Locale] || "USD";

  return (
    <html lang={locale}>
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-S8ZJYR7S6R" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-S8ZJYR7S6R');`,
          }}
        />
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6415988522781682"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <Providers
            exchangeRates={exchangeRates}
            initialCurrency={initialCurrency}
          >
            {children}
            <OutboundTracker />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
