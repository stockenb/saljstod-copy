// lib/ga.js
export function gaEvent(action, params = {}) {
  if (typeof window === "undefined") return;

  // ✅ GTM / dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: action, ...params });

  // (valfritt) GA4 direkt – om du fortfarande laddar @next/third-parties/google
  if (window.gtag) {
    window.gtag("event", action, params);
  }
}
