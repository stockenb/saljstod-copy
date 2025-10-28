// app/usePageTracking.js
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function usePageTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Om du kör GA via GTM, räcker dataLayer-push:
    window.dataLayer = window.dataLayer || [];
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    window.dataLayer.push({
      event: "page_view",
      page_path: url,
      page_location: window.location.href,
      page_title: document.title,
    });

    // Om du kör GA4 direkt med gtag (utan GTM), kan du även:
    if (window.gtag) {
      window.gtag("event", "page_view", {
        page_path: url,
        page_location: window.location.href,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams]);
}
