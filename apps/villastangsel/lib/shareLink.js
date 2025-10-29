// lib/shareLink.js
import LZString from "lz-string";

export function buildShareUrl(state) {
  // state = { runs, gates, height, color, mesh, includeConcrete, includeGate, address }
  const payload = JSON.stringify(state);
  const enc = LZString.compressToEncodedURIComponent(payload);
  const origin =
    typeof window !== "undefined" && window.location
      ? window.location.origin
      : ""; // fallback
        const pathname =
    typeof window !== "undefined" && window.location
      ? window.location.pathname || "/"
      : "/";
  const basePath = pathname.startsWith("/villastangsel")
    ? "/villastangsel"
    : pathname.startsWith("/industristangsel")
    ? "/industristangsel"
    : "/";

  // query ?view=1 triggar readOnly-vy, hash bär datan
  return `${origin}${basePath === "/" ? "" : basePath}?view=1#s=${enc}`;
}

export function readStateFromHash() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  const m = hash.match(/#s=([^&]+)/);
  if (!m) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(m[1]);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
