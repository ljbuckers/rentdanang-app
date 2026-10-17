import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListingExplorer from "@/components/ListingExplorer";
import { getHomeMetadata, isHomeLocale } from "@/lib/home-seo";

type HomeProps = {
  params: { locale: string } | Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomeProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isHomeLocale(locale)) {
    notFound();
  }
  return getHomeMetadata(locale);
}

export default function HomePage() {
  return <ListingExplorer />;
}
