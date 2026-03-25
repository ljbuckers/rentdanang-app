const affiliateLinks = [
  {
    label: "Book accommodation",
    href: `https://www.travelpayouts.com/click?shmarker=${process.env.NEXT_PUBLIC_TRAVELPAYOUTS_ID || ""}&promo_id=4132&source_type=link&type=click`,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0-.75 3.75m0 0-.75 3.75" />
      </svg>
    ),
  },
  {
    label: "Get travel insurance",
    href: process.env.NEXT_PUBLIC_SAFETYWING_REFERRAL || "https://safetywing.com/nomad-insurance",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    label: "Transfer money",
    href: process.env.NEXT_PUBLIC_WISE_REFERRAL || "https://wise.com",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
];

interface AffiliateBarProps {
  context?: string;
}

export default function AffiliateBar({ context }: AffiliateBarProps) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-5">
      <p className="text-sm font-semibold text-gray-900 mb-3">
        {context ? `Planning your move to ${context}?` : "Planning your move?"}
      </p>
      <div className="flex flex-wrap gap-3">
        {affiliateLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-2 bg-white border border-amber-200 text-gray-800 px-4 py-2.5 rounded-lg text-sm font-medium hover:border-[#e8734a] hover:text-[#e8734a] transition-colors shadow-warm"
          >
            <span className="text-[#f4a940]">{link.icon}</span>
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
