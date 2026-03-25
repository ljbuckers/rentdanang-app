const ROUTES = [
  {
    label: "Da Nang Airport transfer",
    from: "Da Nang Airport",
    to: "Da Nang",
  },
  {
    label: "Da Nang to Hoi An",
    from: "Da Nang",
    to: "Hoi An",
  },
  {
    label: "Da Nang to Hue",
    from: "Da Nang",
    to: "Hue",
  },
  {
    label: "Hanoi to Da Nang",
    from: "Hanoi",
    to: "Da Nang",
  },
  {
    label: "Ho Chi Minh to Da Nang",
    from: "Ho Chi Minh",
    to: "Da Nang",
  },
];

function build12GoUrl(from: string, to: string): string {
  const affiliateId = process.env.NEXT_PUBLIC_12GO_AFFILIATE || "";
  const base = "https://12go.asia/en/travel";
  const fromSlug = from.toLowerCase().replace(/\s+/g, "-");
  const toSlug = to.toLowerCase().replace(/\s+/g, "-");
  return `${base}/${fromSlug}/${toSlug}?z=affiliate_id:${affiliateId}`;
}

interface TransportLinksProps {
  areaName?: string;
}

export default function TransportLinks({ areaName }: TransportLinksProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Getting {areaName ? `to ${areaName}` : "around"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ROUTES.map((route) => (
          <a
            key={route.label}
            href={build12GoUrl(route.from, route.to)}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-[#e8734a] hover:shadow-warm transition-all group"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[#f4a940] group-hover:text-[#e8734a] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium text-gray-900">{route.label}</p>
              <p className="text-xs text-gray-500">
                {route.from} → {route.to}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
