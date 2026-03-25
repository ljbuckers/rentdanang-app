"use client";

import { useCurrency } from "@/components/CurrencyProvider";
import type { AreaMarketData } from "@/lib/stats";

interface Props {
  data: AreaMarketData;
  areaName: string;
}

export default function AreaMarketStats({ data, areaName }: Props) {
  const { currency, format } = useCurrency();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <h2 className="text-2xl font-bold mb-2">Market Data: {areaName}</h2>
      <p className="text-gray-500 text-sm mb-6">
        Live pricing from {data.totalActive.toLocaleString()} active listings
        {data.newThisWeek > 0 && (
          <> · <span className="text-green-600">{data.newThisWeek} new this week</span></>
        )}
        {data.avgDaysOnMarket > 0 && (
          <> · Avg {data.avgDaysOnMarket} days on market</>
        )}
      </p>

      {/* Bedroom Pricing Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-700">Type</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-700">Listings</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-700">Median/mo</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-700 hidden sm:table-cell">Range/mo</th>
            </tr>
          </thead>
          <tbody>
            {data.bedroomPricing.map((bp) => (
              <tr key={bp.bedrooms} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-2 font-medium">{bp.label}</td>
                <td className="py-3 px-2 text-right text-gray-600">{bp.count}</td>
                <td className="py-3 px-2 text-right font-semibold text-amber-600">
                  {format(bp.medianVnd)}
                </td>
                <td className="py-3 px-2 text-right text-gray-500 hidden sm:table-cell">
                  {format(bp.minVnd)} – {format(bp.maxVnd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Property Types */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Property Types</h3>
        <div className="flex flex-wrap gap-2">
          {data.propertyTypes.map((pt) => (
            <span
              key={pt.type}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 capitalize"
            >
              {pt.type}
              <span className="ml-1.5 text-xs text-gray-500">({pt.count})</span>
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Prices in {currency}. Updated live from {data.totalActive.toLocaleString()} verified listings across 5 platforms.
      </p>
    </div>
  );
}
