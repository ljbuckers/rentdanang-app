"use client";

import { useEffect } from "react";

/**
 * Tracks outbound affiliate link clicks via GA4.
 * Mount once in layout. Listens for clicks on external links.
 */
export default function OutboundTracker() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (!link) return;
      
      const href = link.href;
      if (!href || href.startsWith(window.location.origin)) return;
      
      // Identify affiliate links
      const affiliatePatterns = [
        { pattern: "safetywing.com", name: "SafetyWing" },
        { pattern: "nordvpn.com", name: "NordVPN" },
        { pattern: "hitchhive.com", name: "HitchHive" },
        { pattern: "bambooroutes.com", name: "BambooRoutes" },
      ];
      
      const affiliate = affiliatePatterns.find(a => href.includes(a.pattern));
      
      if (typeof window.gtag === "function") {
        window.gtag("event", "click", {
          event_category: affiliate ? "affiliate_click" : "outbound_click",
          event_label: affiliate ? affiliate.name : href,
          transport_type: "beacon",
          outbound: true,
        });
      }
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return null;
}
