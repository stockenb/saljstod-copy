// app/page.jsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LZString from "lz-string";
import PromoPopup from "../components/PromoPopup";

// Ladda MapTool utan SSR
const MapTool = dynamic(() => import("../components/MapTool"), { ssr: false });

// Läser delat state från URL (?s=...) eller fallback #s=...
function readSharedStateFromLocation() {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);

  // 1) Nytt sätt (rekommenderat i hand-over): ?s=<komprimerat>
  const sParam = url.searchParams.get("s");
  if (sParam) {
    try {
      const json = LZString.decompressFromEncodedURIComponent(sParam);
      return JSON.parse(json || "{}");
    } catch {}
  }

  // 2) Fallback till ditt tidigare hash-upplägg: #s=<komprimerat>
  const m = (window.location.hash || "").match(/#s=([^&]+)/);
  if (m) {
    try {
      const json = LZString.decompressFromEncodedURIComponent(m[1]);
      return JSON.parse(json || "{}");
    } catch {}
  }

  return null;
}

export default function Page() {
  const [initial, setInitial] = useState(null);
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);

    // Om vi har delat state (antingen ?s= eller #s=) så går vi in i read-only
    const shared = readSharedStateFromLocation();
    if (shared) {
      setInitial(shared);
      setReadOnly(true);
      return;
    }

    // Ditt tidigare villkor: ?view=1 + hash
    if (url.searchParams.get("view") === "1") {
      const st = readSharedStateFromLocation();
      if (st) {
        setInitial(st);
        setReadOnly(true);
      }
    }
  }, []);

  return (
    <>
      <MapTool initialState={initial} readOnly={readOnly} />
      {/* Visa inte rabatt-popupen i read-only-läge */}
      {!readOnly && <PromoPopup delayMs={5000} />}
    </>
  );
}
