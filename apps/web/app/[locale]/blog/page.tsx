import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Da Nang Real Estate Blog | RentDaNang",
  description: "Market data, neighborhood guides, and practical advice for renters in Da Nang, Vietnam.",
  alternates: { canonical: "https://rentdanang.app/blog" },
};

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import { getAllPosts } from "@/lib/blog-content";

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  image: string;
  content: string;
}

function getExcerpt(html: string): string {
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > 180 ? text.substring(0, 180) + '...' : text;
}

const posts: BlogPost[] = getAllPosts();

export default async function BlogPage() {
  const t = await getTranslations("blog");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t("pageTitle")}</h1>
        <p className="text-xl text-gray-600 mb-8">{t("pageSubtitle")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="group block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <div className="relative aspect-video bg-gray-200 overflow-hidden">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-500 mb-2">{post.date}</p>
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-2">{post.title}</h2>
                <p className="text-gray-600 mt-2 line-clamp-3">{getExcerpt(post.content)}</p>
                <p className="text-primary font-medium mt-4 flex items-center gap-1">
                  {t("readArticle")}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                  </svg>
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
