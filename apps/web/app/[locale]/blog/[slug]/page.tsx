import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getPost, getAllPosts } from "@/lib/blog-content";
import AdUnit from "@/components/AdUnit";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const description = post.content.replace(/<[^>]*>/g, '').substring(0, 160) + "...";
  const ogImage = post.image || "/og-default.png";

  return {
    title: `${post.title} | RentDaNang Blog`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: new Date(post.date).toISOString(),
      images: [{ url: ogImage, width: 1200, height: 630 }],
      siteName: "RentDaNang",
    },
    alternates: {
      canonical: `https://rentdanang.app/blog/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  
  if (!post) {
    notFound();
  }

  // JSON-LD Article Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "datePublished": new Date(post.date).toISOString(),
    "author": {
      "@type": "Organization",
      "name": "RentDaNang"
    },
    "publisher": {
      "@type": "Organization",
      "name": "RentDaNang",
      "logo": {
        "@type": "ImageObject",
        "url": "https://rentdanang.app/logo.png"
      }
    },
    "description": post.content.replace(/<[^>]*>/g, '').substring(0, 160)
  };

  return (
    <article className="container mx-auto px-4 py-12 max-w-4xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="mb-8 text-center">
        <Link href="/blog" className="text-primary font-medium hover:underline mb-4 inline-block">
          &larr; Back to Blog
        </Link>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
        <div className="text-gray-500">{post.date}</div>
      </div>

      <AdUnit format="auto" />

      <div 
        className="prose prose-lg max-w-none mx-auto"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      <AdUnit format="auto" />
      
      {/* Related Articles */}
      {(() => {
        const allPosts = getAllPosts().filter(p => p.slug !== slug).slice(0, 3);
        return allPosts.length > 0 ? (
          <div className="mt-12 pt-8 border-t">
            <h3 className="text-2xl font-bold mb-6">Keep Reading</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {allPosts.map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="block p-4 border rounded-lg hover:bg-gray-50 transition">
                  {p.image && <img src={p.image} alt={p.title} className="w-full h-32 object-cover rounded mb-3" />}
                  <div className="font-bold text-sm">{p.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{p.date}</div>
                </Link>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Related Listings */}
      <div className="mt-8 pt-8 border-t">
        <h3 className="text-2xl font-bold mb-6">Find Your Apartment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/rent/an-thuong" className="block p-4 border rounded-lg hover:bg-gray-50 transition">
            <div className="font-bold">An Thuong Apartments</div>
            <div className="text-sm text-gray-500">Walkable, beachside living</div>
          </Link>
          <Link href="/rent/son-tra" className="block p-4 border rounded-lg hover:bg-gray-50 transition">
            <div className="font-bold">Son Tra Rentals</div>
            <div className="text-sm text-gray-500">Quiet, scenic, affordable</div>
          </Link>
        </div>
      </div>
    </article>
  );
}
