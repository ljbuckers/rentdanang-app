import { describe, expect, it } from "vitest";
import { defaultLocale, locales, type Locale } from "../i18n/config";
import { getHomeMetadata, isHomeLocale } from "../lib/home-seo";

const origin = "https://rentdanang.app";
const urlFor = (locale: Locale) => locale === defaultLocale ? origin : `${origin}/${locale}`;

describe("home page search and social metadata", () => {
  it.each(locales)("keeps %s canonical, reciprocal language links and social copy consistent", (locale) => {
    const meta = getHomeMetadata(locale);
    const graph = meta.openGraph;
    expect(isHomeLocale(locale)).toBe(true);
    expect(meta.alternates?.canonical).toBe(urlFor(locale));
    expect(meta.alternates?.languages?.["x-default"]).toBe(origin);
    expect(Object.keys(meta.alternates?.languages ?? {}).sort()).toEqual([...locales, "x-default"].sort());
    for (const alternate of locales) {
      expect(meta.alternates?.languages?.[alternate]).toBe(urlFor(alternate));
    }
    expect(graph?.url).toBe(urlFor(locale));
    expect(graph?.title).toBe(meta.title);
    expect(graph?.description).toBe(meta.description);
    expect(graph?.siteName).toBe("RentDaNang");
    expect(graph?.alternateLocale).toHaveLength(locales.length - 1);
    expect(graph?.alternateLocale).not.toContain(graph?.locale);
    expect(graph?.images).toEqual([
      { url: `${origin}/og-default.png`, width: 1200, height: 630, alt: meta.title },
    ]);
    expect(meta.twitter?.title).toBe(meta.title);
    expect(meta.twitter?.description).toBe(meta.description);
    expect(meta.twitter?.images).toEqual([{ url: `${origin}/og-default.png`, alt: meta.title }]);
  });

  it("provides distinct translated titles and descriptions for all configured locales", () => {
    const metadata = locales.map(getHomeMetadata);
    expect(new Set(metadata.map((meta) => meta.title)).size).toBe(locales.length);
    expect(new Set(metadata.map((meta) => meta.description)).size).toBe(locales.length);
    for (const meta of metadata) {
      expect(meta.title).toEqual(expect.any(String));
      expect(meta.description).toEqual(expect.any(String));
      expect(JSON.stringify(meta)).not.toMatch(/6,?500|verified listings|verified apartments/i);
    }
  });

  it.each(["fr", "EN", "en/../../admin", "__proto__", ""])("rejects unsupported locale %s", (locale) => {
    expect(isHomeLocale(locale)).toBe(false);
    expect(() => getHomeMetadata(locale as Locale)).toThrow(RangeError);
  });

  it("returns fresh language maps so one request cannot modify a later request", () => {
    const first = getHomeMetadata("vi");
    const languages = first.alternates?.languages;
    if (!languages) throw new Error("Missing language links");
    languages.vi = "https://example.invalid";
    expect(getHomeMetadata("vi").alternates?.languages?.vi).toBe(`${origin}/vi`);
  });
});
