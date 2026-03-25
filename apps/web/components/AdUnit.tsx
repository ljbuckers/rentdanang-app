"use client";

import { useEffect, useRef } from "react";

interface AdUnitProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle";
  className?: string;
  layout?: string;
}

export default function AdUnit({ slot, format = "auto", className = "", layout }: AdUnitProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;

    const tryPush = () => {
      try {
        const w = window as any;
        if (w.adsbygoogle) {
          w.adsbygoogle.push({});
          pushed.current = true;
          return true;
        }
      } catch (e) {
        // AdSense not ready
      }
      return false;
    };

    if (!tryPush()) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (tryPush() || attempts >= 10) clearInterval(interval);
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className={`my-6 text-center min-h-[90px] ${className}`} ref={adRef}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: "90px" }}
        data-ad-client="ca-pub-6415988522781682"
        data-ad-format={format}
        data-full-width-responsive="true"
        {...(slot ? { "data-ad-slot": slot } : {})}
        {...(layout ? { "data-ad-layout": layout } : {})}
      />
    </div>
  );
}
