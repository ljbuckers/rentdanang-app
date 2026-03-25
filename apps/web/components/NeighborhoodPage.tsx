import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { AreaStats, AreaMarketData } from "@/lib/stats";
import AreaMarketStats from "@/components/AreaMarketStats";
import { NeighborhoodContent } from "@/lib/neighborhoods";
import ListingCard from "@/components/Listings/ListingCard";

interface Props {
  stats: AreaStats;
  marketData?: AreaMarketData;
  content: NeighborhoodContent;
}

export default function NeighborhoodPage({ stats, marketData, content }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section */}
      <div className="relative h-[400px] w-full">
        <Image
          src={content.heroImage}
          alt={content.name}
          fill
          className="object-cover brightness-75"
          priority
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">{content.name}</h1>
          <p className="text-xl max-w-2xl drop-shadow-md">
            {stats.listingCount} active listings available now
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-10 relative z-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white rounded-xl shadow-lg p-6 mb-12">
          <div className="text-center p-4 border-r last:border-0">
            <p className="text-gray-500 text-sm uppercase tracking-wide">Avg Price (USD)</p>
            <p className="text-2xl font-bold text-primary">${stats.avgPriceUsd}</p>
          </div>
          <div className="text-center p-4 border-r last:border-0">
            <p className="text-gray-500 text-sm uppercase tracking-wide">Avg Price (VND)</p>
            <p className="text-2xl font-bold text-primary">{(stats.avgPriceVnd / 1000000).toFixed(1)}M</p>
          </div>
          <div className="text-center p-4 border-r last:border-0">
            <p className="text-gray-500 text-sm uppercase tracking-wide">Lowest Price</p>
            <p className="text-2xl font-bold text-green-600">${stats.minPriceUsd}</p>
          </div>
          <div className="text-center p-4">
            <p className="text-gray-500 text-sm uppercase tracking-wide">Listings</p>
            <p className="text-2xl font-bold text-blue-600">{stats.listingCount}</p>
          </div>
        </div>

        {marketData && <AreaMarketStats data={marketData} areaName={content.name} />}
        {/* Description & Features */}
        <div className="grid md:grid-cols-3 gap-12 mb-16">
          <div className="md:col-span-2 prose prose-lg max-w-none">
            <h2 className="text-3xl font-bold mb-6">About {content.name}</h2>
            <p className="text-gray-600 leading-relaxed text-lg">{content.description}</p>
            
            <h3 className="text-2xl font-bold mt-8 mb-4">Why Live Here?</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {content.features.map((feature, i) => (
                <li key={i} className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm h-fit sticky top-24">
            <h3 className="text-xl font-bold mb-4">Quick Facts</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Walkability</span>
                <span className="font-medium text-green-600">High</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Noise Level</span>
                <span className="font-medium text-yellow-600">Medium</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Expat Density</span>
                <span className="font-medium text-blue-600">High</span>
              </div>
            </div>
            <Link 
              href={`/rent?area=${content.slug}`} 
              className="mt-6 block w-full bg-primary text-white text-center py-3 rounded-lg font-bold hover:bg-primary/90 transition"
            >
              View All Listings
            </Link>
          </div>
        </div>

        {/* Top Listings */}
        <div className="mb-16">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold">Featured Listings</h2>
              <p className="text-gray-500 mt-2">Top-rated properties available in {content.name}</p>
            </div>
            <Link href={`/rent?area=${content.slug}`} className="text-primary font-medium hover:underline">
              View All &rarr;
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.topListings.map((listing: any) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 md:p-12 shadow-sm">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-8">
            {content.faqs.map((faq, i) => (
              <div key={i}>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
