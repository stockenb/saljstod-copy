"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as turf from "@turf/turf";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useJsApiLoader, GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";
import ToolHelp from "../components/ToolHelp";
import HelpTip from "./HelpTip"; // högst upp i filen
import { gaEvent } from "../lib/ga";
import { buildShareUrl } from "../lib/shareLink";





/* ===== Konstanter ===== */
const DEFAULT_CENTER = { lat: 59.3293, lng: 18.0686 }; // Stockholm TESTKOMMENTAR
const STEP_METERS = 3;
const ACCENT_RED = "#d92d20";
const CORNER_THRESHOLD = 45;
const ROLL_LENGTH_M = 25;
const STAY_WIRE_RATIO = 2;
const STAY_WIRE_ROLL_M = 50;
const BARBWIRE_LINES = 3;
const BARBWIRE_ROLL_M = 250;
const BUNDLED_PRODUCTS_URL = "/data/products.xlsx";
const CONCRETE_PER_POST = 3; // 3 st plintbetong per stolpe
const GATE_CONCRETE_PER_GATE = 6; // 3 säck per grindstolpe, 2 stolpar per grind



/* ===== Små UI-ikoner ===== */
const Chevron = ({ open }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    aria-hidden
    style={{
      transform: open ? "rotate(0deg)" : "rotate(-90deg)",
      transition: "transform 160ms ease",
    }}
  >
    <path
      d="M6 9l6 6 6-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ===== Geo-helpers ===== */
function metersBetween(a, b) {
  const p1 = turf.point([a.lng, a.lat]);
  const p2 = turf.point([b.lng, b.lat]);
  return turf.distance(p1, p2, { units: "kilometers" }) * 1000;
}
function bearingDeg(a, b) {
  return turf.bearing([a.lng, a.lat], [b.lng, b.lat]);
}
function turningAngleDeg(prev, curr, next) {
  const b1 = bearingDeg(prev, curr);
  const b2 = bearingDeg(curr, next);
  let diff = Math.abs(b2 - b1);
  if (diff > 180) diff = 360 - diff;
  return diff;
}
const toPoint = (v) => turf.point([v.lng, v.lat]);

// --- Google Static Maps helpers (TOP-LEVEL) ---
// Lägg detta block strax efter geo-helpersna och före computeAll()

function encodeSigned(value) {
  let sgn_num = value < 0 ? ~(value << 1) : (value << 1);
  let encoded = "";
  while (sgn_num >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgn_num & 0x1f)) + 63);
    sgn_num >>= 5;
  }
  encoded += String.fromCharCode(sgn_num + 63);
  return encoded;
}

function encodePolyline(points) {
  let prevLat = 0, prevLng = 0, result = "";
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    result += encodeSigned(lat - prevLat);
    result += encodeSigned(lng - prevLng);
    prevLat = lat; prevLng = lng;
  }
  return result;
}

export function buildStaticMapUrl({ runs }) {
  const base = new URL("https://maps.googleapis.com/maps/api/staticmap");
  base.searchParams.set("size", "1280x900");
  base.searchParams.set("scale", "2");
  base.searchParams.set("maptype", "roadmap");
  base.searchParams.append("style", "feature:poi|visibility:off");
  base.searchParams.append("style", "feature:transit|visibility:off");

  const color = "0xd92d20ff";
  let pathsAdded = 0;

  for (const r of runs || []) {
    if (!r?.vertices || r.vertices.length < 2) continue;
    const pts = r.closed ? [...r.vertices, r.vertices[0]] : r.vertices;
    const enc = encodePolyline(pts);
    base.searchParams.append("path", `weight:4|color:${color}|enc:${enc}`);
    pathsAdded++;
  }

  if (pathsAdded === 0) return null; // inget att rita → spara null

  base.searchParams.set("key", process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "");
  return base.toString();
}

async function fetchImageDataUrl(url) {
  return await new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxW = 1000;
      const ratio = Math.min(1, maxW / img.width);
      canvas.width = Math.max(1, Math.floor(img.width * ratio));
      canvas.height = Math.max(1, Math.floor(img.height * ratio));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try { resolve(canvas.toDataURL("image/png")); } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}


/* ===== Kärnlogik inkl. sluten slinga (forceClosed) ===== */
function computeAll(vertices, forceClosed = false) {
  if (!vertices || vertices.length < 2) {
    return {
      lengthMeters: 0,
      endPosts: 0,
      cornerPosts: 0,
      intermediatePosts: 0,
      cornerPoints: [],
      intermediatePoints: [],
      rolls: 0,
      stays: 0,
      stayWireMeters: 0,
      stayWireRolls: 0,
      barbwireMeters: 0,
      barbwireRolls: 0,
    };
  }

  const CLOSE_TOL_M = 0.8;
  let closed = false;
  let work = vertices.slice();

  if (vertices.length >= 3) {
    const dStartEnd = metersBetween(vertices[0], vertices[vertices.length - 1]);
    if (dStartEnd <= CLOSE_TOL_M) {
      closed = true;
      work = vertices.slice(0, -1);
    }
  }
  if (forceClosed && work.length >= 3) closed = true;

  const coords = work.map((v) => [v.lng, v.lat]);
  if (closed && work.length >= 2) coords.push([work[0].lng, work[0].lat]);
  const line = turf.lineString(coords);
  const lengthMeters = turf.length(line, { units: "kilometers" }) * 1000;

  // Hörn
  const cornerIdx = [];
  if (work.length >= 3) {
    if (closed) {
      const n = work.length;
      for (let i = 0; i < n; i++) {
        const prev = work[(i - 1 + n) % n],
          curr = work[i],
          next = work[(i + 1) % n];
        const ang = turningAngleDeg(prev, curr, next);
        if (ang > CORNER_THRESHOLD) cornerIdx.push(i);
      }
    } else {
      for (let i = 1; i < work.length - 1; i++) {
        const ang = turningAngleDeg(work[i - 1], work[i], work[i + 1]);
        if (ang > CORNER_THRESHOLD) cornerIdx.push(i);
      }
    }
  }
  const cornerPoints = cornerIdx.map((i) => work[i]);

  const endPosts = closed ? 0 : 2;

  // Mellanstolpar var 3 m (undvik nära vertices)
  const tolerance = 0.3;
  const intermediatePoints = [];
  for (let d = STEP_METERS; d < lengthMeters - 0.001; d += STEP_METERS) {
    const pt = turf.along(line, d / 1000, { units: "kilometers" });
    const [lng, lat] = pt.geometry.coordinates;
    const nearVertex = work.some((v) => metersBetween({ lat, lng }, v) <= tolerance);
    if (!nearVertex) intermediatePoints.push({ lat, lng });
  }

  let extraIntermediateAtClosure = 0;
  if (closed && work.length >= 2) {
    const isCornerAtStart = cornerIdx.includes(0);
    if (!isCornerAtStart) extraIntermediateAtClosure = 1;
  }
  const intermediateCount = intermediatePoints.length + extraIntermediateAtClosure;

  const rolls = Math.ceil(lengthMeters / ROLL_LENGTH_M);
  const stays = endPosts + 2 * cornerPoints.length;
  const stayWireMeters = STAY_WIRE_RATIO * lengthMeters;
  const stayWireRolls = Math.ceil(stayWireMeters / STAY_WIRE_ROLL_M);
  const barbwireMeters = BARBWIRE_LINES * lengthMeters;
  const barbwireRolls = Math.ceil(barbwireMeters / BARBWIRE_ROLL_M);

  return {
    lengthMeters,
    endPosts,
    cornerPosts: cornerPoints.length,
    intermediatePosts: intermediateCount,
    cornerPoints,
    intermediatePoints,
    rolls,
    stays,
    stayWireMeters,
    stayWireRolls,
    barbwireMeters,
    barbwireRolls,
  };
}

/* ===== Hjälp: Excel-normalisering mm ===== */
function norm(x) {
  if (x == null) return "";
  if (typeof x === "number") return String(x);
  return String(x).trim();
}
function toNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}
function normalizeRows(rows) {
  const keyed = rows.map((r) => {
    const obj = {};
    for (const k of Object.keys(r)) {
      const nk = k.toString().trim().toLowerCase().replace(/\s+/g, "_");
      obj[nk] = r[k];
    }
    return obj;
  });

  return keyed.map((r) => ({
    sku: (r.sku ?? r.artikelnummer ?? r.artnr ?? "")?.toString(),
    product_type: r.product_type ?? r.typ ?? "",
    name: r.name ?? r.benamning ?? r.benämning ?? "",
    height_mm: r.height_mm ?? r.hojd_mm ?? r.höjd_mm ?? r.hojd ?? r.höjd ?? "",
    color: r.color ?? r.farg ?? r.färg ?? "",
    mesh_mm: r.mesh_mm ?? r.maska_mm ?? r.maska ?? r.maskstorlek ?? "",
    roll_length_m: r.roll_length_m ?? r.rull_langd_m ?? r.rullängd_m ?? r.rull ?? "",
    spacing_m: r.spacing_m ?? r.avstand_m ?? r.avstånd_m ?? "",
    price_sek: r.price_sek ?? r.pris ?? r.pris_sek ?? "",
    supplier: r.supplier ?? r.leverantor ?? r.leverantör ?? "",
    notes: r.notes ?? r.noteringar ?? "",

    // === Viktigt för grindmatchning ===
    width_label: r.width ?? r.bredd ?? r.width_mm ?? r.bredd_mm ?? "",

    // Ev. explicita vingar
    wing_a_mm: r.wing_a_mm ?? r.left_mm ?? r.vinge_a_mm ?? r.vinge1_mm ?? "",
    wing_b_mm: r.wing_b_mm ?? r.right_mm ?? r.vinge_b_mm ?? r.vinge2_mm ?? "",
  }));
}

/* Slå ihop dubbletter & filtrera bort ogiltiga SKUs */
function consolidateItems(items) {
  const map = new Map();
  for (const r of items) {
    const rawSku = r?.sku;
    const sku = rawSku == null ? "" : String(rawSku).trim();
    const qty = Number(r?.qty || 0);
    if (!sku || sku === "—" || !Number.isFinite(qty) || qty <= 0) continue;
    const prev = map.get(sku) || 0;
    map.set(sku, prev + qty);
  }
  return Array.from(map.entries()).map(([sku, quantity]) => ({ sku, quantity }));
}

/* Kombinera rader med samma artikelnummer för PDF:en */
function mergeRowsBySku(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];

  const merged = [];
  const bySku = new Map();

  for (const row of rows) {
    const rawSku = row?.sku;
    const sku = rawSku == null ? "" : String(rawSku).trim();
    const qty = Number(row?.qty || 0);

    // Saknas SKU → kan inte konsolideras, men se till att kvantiteten är numerisk
    if (!sku || sku === "—") {
      merged.push({ ...row, qty: Number.isFinite(qty) ? qty : row?.qty });
      continue;
    }

    if (!Number.isFinite(qty) || qty <= 0) {
      merged.push({ ...row, qty });
      continue;
    }

    const existing = bySku.get(sku);
    if (existing) {
      existing.qty += qty;
      // Om tidigare rad saknade pris men nuvarande har ett, uppdatera priset
      if (existing.price_sek == null && row?.price_sek != null) {
        existing.price_sek = row.price_sek;
      }
      continue;
    }

    const clone = { ...row, qty };
    bySku.set(sku, clone);
    merged.push(clone);
  }

  return merged;
}

/* ===== SKU-urval ===== */
function pickSku(skus, { product_type, height_mm, color, mesh_mm, roll_length_m }) {
  const h = toNum(height_mm);
  const m = toNum(mesh_mm);
  const rl = toNum(roll_length_m);
  const c = norm(color);

  let candidates = skus.filter(
    (r) =>
      norm(r.product_type) === product_type &&
      (h === undefined || toNum(r.height_mm) === h) &&
      (c === "" || norm(r.color) === c) &&
      (m === undefined || toNum(r.mesh_mm) === m) &&
      (rl === undefined || toNum(r.roll_length_m) === rl)
  );
  if (candidates.length) return candidates[0];

  candidates = skus.filter((r) => norm(r.product_type) === product_type && (c === "" || norm(r.color) === c));
  if (candidates.length) return candidates[0];

  candidates = skus.filter((r) => norm(r.product_type) === product_type);
  if (candidates.length) return candidates[0];

  return null;
}

/* ===== Grindhjälp ===== */
function parseWidthLabelToPair(label) {
  if (!label) return null;
  const s = String(label).replace(/\s+/g, "");
  const parts = s.split("+");
  if (parts.length === 1) {
    const m = parts[0].match(/(\d+)/);
    return m ? [Number(m[1])] : null; // single
  }
  if (parts.length === 2) {
    const a = parts[0].match(/(\d+)/);
    const b = parts[1].match(/(\d+)/);
    if (a && b) return [Number(a[1]), Number(b[1])];
  }
  return null;
}

function normalizeTypeKey(s) {
  const t = (s ?? "").toString().trim().toLowerCase();
  if (!t) return "";
  const singleKeys = ["gate_single", "enkelgrind", "grind enkel", "enkel grind", "single_gate", "single"];
  const doubleKeys = ["gate_double", "dubbelgrind", "grind dubbel", "dubbel grind", "double_gate", "double"];
  if (singleKeys.includes(t)) return "gate_single";
  if (doubleKeys.includes(t)) return "gate_double";
  if (t.includes("grind") && t.includes("enkel")) return "gate_single";
  if (t.includes("grind") && t.includes("dubbel")) return "gate_double";
  return t;
}

// Robust parsning av kolumnen width/width_mm: "2000mm + 2000mm", "2000 mm+2000 mm", etc.
function parseWidthField(w) {
  if (w == null) return null;
  let s = String(w).toLowerCase();
  s = s.replace(/[\s\u00A0\u202F]+/g, "");
  s = s.replace(/mm/g, "");
  if (!s) return null;

  if (s.includes("+")) {
    const [aStr, bStr] = s.split("+");
    const a = Number(aStr),
      b = Number(bStr);
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return { kind: "double", a, b, total: a + b };
    }
    return null;
  }
  const n = Number(s);
  if (Number.isFinite(n)) return { kind: "single", w: n, total: n };
  return null;
}

// Fallback: parsa totalbredd från namnet, t.ex. "1200x4000" eller "1200 x 4000"
function parseWidthFromName(name) {
  if (!name) return null;
  const s = String(name).toLowerCase().replace(/[\s\u00A0\u202F]+/g, "");
  const m = s.match(/(\d{3,4})[x×](\d{3,4})/);
  if (!m) return null;
  const height = Number(m[1]);
  const total = Number(m[2]);
  if (!Number.isFinite(total)) return null;
  return { height, total };
}

function getParsedWidthFromRow(row) {
  const pf = parseWidthField(row.width_mm ?? row.width ?? row.bredd_mm ?? row.bredd);
  if (pf) return pf;
  const nf = parseWidthFromName(row.name);
  return nf ? { kind: "name_total", total: nf.total } : null;
}

function pickGateSku(skus, { type, height_mm, color, widthSingle, widthPairLabel }) {
  const typeKey = type === "double" ? "gate_double" : "gate_single";
  const wantedHeight = Number(height_mm) || undefined;
  const wantedColor = (color ?? "").toString().trim().toLowerCase();

  // 1) Börja med rätt typ (inkl. svenska/varianter)
  let all = skus.filter((r) => normalizeTypeKey(r.product_type) === typeKey);
  if (!all.length) {
    all = skus.filter((r) => {
      const t = (r.product_type ?? "").toString().toLowerCase();
      return t.includes("grind") || t.includes("gate");
    });
  }
  if (!all.length) return null;

  const byHeight = (arr) => (wantedHeight ? arr.filter((r) => Number(r.height_mm) === wantedHeight) : arr);
  const byColor = (arr) =>
    wantedColor ? arr.filter((r) => (r.color ?? "").toString().trim().toLowerCase() === wantedColor) : arr;

  if (typeKey === "gate_single") {
    const w = Number(widthSingle);

    // 2) Exakt match via kolumnen width/width_mm
    let wMatch = all.filter((r) => {
      const pw = getParsedWidthFromRow(r);
      return pw && ((pw.kind === "single" && pw.w === w) || pw.total === w);
    });
    // Skär av med höjd → färg
    let cand = byColor(byHeight(wMatch));
    if (cand.length) return cand[0];
    cand = byHeight(wMatch);
    if (cand.length) return cand[0];

    // 3) Inga kolumnträffar – försök totalbredd ur namn (t.ex. "1200x1000" för enkel 1000)
    const nameMatch = all.filter((r) => {
      const nf = parseWidthFromName(r.name);
      return nf && nf.total === w;
    });
    cand = byColor(byHeight(nameMatch));
    if (cand.length) return cand[0];
    cand = byHeight(nameMatch);
    if (cand.length) return cand[0];

    // 4) Sista fallback inom typen
    cand = byColor(byHeight(all));
    return cand[0] || all[0] || null;
  } else {
    // DOUBLE
    const [a, b] = String(widthPairLabel)
      .split("+")
      .map((x) => Number(x));
    const sum = Number.isFinite(a) && Number.isFinite(b) ? a + b : undefined;

    // 2) Exakt match via kolumnen (ordning på vingarna spelar ingen roll) eller via total
    let wMatch = all.filter((r) => {
      const pw = getParsedWidthFromRow(r);
      if (!pw) return false;

      if (pw.kind === "double" && Number.isFinite(a) && Number.isFinite(b)) {
        return (pw.a === a && pw.b === b) || (pw.a === b && pw.b === a);
      }
      if (Number.isFinite(sum) && Number.isFinite(pw.total)) {
        return pw.total === sum;
      }
      return false;
    });

    let cand = byColor(byHeight(wMatch));
    if (cand.length) return cand[0];
    cand = byHeight(wMatch);
    if (cand.length) return cand[0];

    // 3) Inga kolumnträffar – försök totalbredd ur namn (t.ex. "1200x4000" för 2000+2000)
    if (Number.isFinite(sum)) {
      const nameMatch = all.filter((r) => {
        const nf = parseWidthFromName(r.name);
        return nf && nf.total === sum;
      });
      cand = byColor(byHeight(nameMatch));
      if (cand.length) return cand[0];
      cand = byHeight(nameMatch);
      if (cand.length) return cand[0];
    }

    // 4) Sista fallback inom typen
    cand = byColor(byHeight(all));
    return cand[0] || all[0] || null;
  }
}

/* ===== UI-hjälp ===== */
const gatePrettyLabel = (g, { color, height }) => {
  const typeTxt = g.type === "single" ? "Enkel" : "Dubbel";
  const widthTxt = g.type === "single" ? `${g.width} mm` : g.width.replace("+", " + ") + " mm";
  return `${typeTxt} ${widthTxt} · ${color} · Höjd ${height} mm`;
};

/* ===== Komponent ===== */
export default function MapTool() {
  /* === Google Maps loader === */
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: ["places"],
  });

  const mapRef = useRef(null);
  const autoRef = useRef(null);

  // Imperativ polyline för AKTIV sträcka
  const mainPolylineRef = useRef(null);
  // Frusna polylines för icke-aktiva sträckor
  const staticPolylinesRef = useRef({});
  // Svarta överlägg som visar grindars bredd
  const gatePolylinesRef = useRef({});
  // rAF för rate-limiting av live-preview
  const rafRef = useRef(0);

  //HelpTool
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Sträckor
  const [runs, setRuns] = useState([]); // [{id, seq, vertices:[{lat,lng}], closed:boolean}]
  const [activeId, setActiveId] = useState(null);

  // Grindplacering & layout
  const [placingGateId, setPlacingGateId] = useState(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  // ID-hjälpare
  const createId = useCallback(
    () =>
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    []
  );

  // === Adress-state ===
const [address, setAddress] = useState("");

// Hjälp: beräkna en representativ punkt (centroid) för alla runs
function getProjectLatLng() {
  try {
    const all = runs?.flatMap(r => r.vertices || []) || [];
    if (!all.length) return null;

    // Centroid via enkel medelpunkt (räcker här, men kan bytas till turf.centroid om du vill)
    const lat = all.reduce((s,p)=>s+p.lat,0)/all.length;
    const lng = all.reduce((s,p)=>s+p.lng,0)/all.length;
    return { lat, lng };
  } catch (e) {
    return null;
  }
}

// Reverse geocode via Google Maps JS API (kräver att "Geocoding API" är aktiverat)
async function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.Geocoder) return resolve(null);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.length) {
        // välj “street_address”/“premise”/“route”-nära resultat om möjligt
        const best = results.find(r =>
          r.types?.includes("street_address") ||
          r.types?.includes("premise") ||
          r.types?.includes("route")
        ) || results[0];
        resolve(best.formatted_address);
      } else {
        resolve(null);
      }
    });
  });
}


  // Initiera första tomma sträcka
  useEffect(() => {
    if (runs.length === 0 && activeId === null) {
      const id = createId();
      setRuns([{ id, seq: 1, vertices: [], closed: false }]);
      setActiveId(id);
    }
  }, [runs.length, activeId, createId]);

  // “Selektorer” för aktiv sträcka
  const activeRun = useMemo(
    () => runs.find((r) => r.id === activeId) || { vertices: [], closed: false },
    [runs, activeId]
  );
  const vertices = activeRun.vertices;
  const closed = activeRun.closed;

  // Setter-wrappers
  const setVertices = useCallback(
    (updater) => {
      setRuns((prev) =>
        prev.map((r) => {
          if (r.id !== activeId) return r;
          const nextVerts = typeof updater === "function" ? updater(r.vertices) : updater;
          return { ...r, vertices: nextVerts };
        })
      );
    },
    [activeId]
  );

  const setClosed = useCallback(
    (valueOrFn) => {
      setRuns((prev) =>
        prev.map((r) => {
          if (r.id !== activeId) return r;
          const nextClosed = typeof valueOrFn === "function" ? valueOrFn(r.closed) : valueOrFn;
          return { ...r, closed: nextClosed };
        })
      );
    },
    [activeId]
  );

  // Specifikation
  const [height, setHeight] = useState("2000");
  const [color, setColor] = useState("Mörkgrön");
  const mesh = "50";

  //Beräkning kollapsad
  const [calcOpen, setCalcOpen] = useState(false);

  // Tillbehör
  const [includeConcrete, setIncludeConcrete] = useState(false);
  const [includeBarbwire, setIncludeBarbwire] = useState(false);
  const [includeGate, setIncludeGate] = useState(false);
  const [gates, setGates] = useState([]); // [{id, type, width, runId?, lat?, lng?, segIdx?}]

const addGate = useCallback(() => {
  const id = createId();
  setGates((prev) => [
    ...prev,
    {
      id,
      runId: activeId,     // 🔹 koppla till aktiv sträcka direkt
      type: "single",
      width: "1000",
      // oplacerad:
      lat: null,
      lng: null,
      segIdx: null,
    },
  ]);
}, [createId, activeId]);


  const updateGate = useCallback((id, patch) => {
    setGates((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }, []);

  const removeGate = useCallback((id) => {
    setGates((prev) => prev.filter((g) => g.id !== id));
    if (gatePolylinesRef.current[id]) {
      gatePolylinesRef.current[id].setMap(null);
      delete gatePolylinesRef.current[id];
    }
  }, []);

  const onToggleIncludeGate = useCallback(
  (checked) => {
    setIncludeGate(checked);

    if (checked && gates.length === 0) {
      const id = createId();
      setGates([
        {
          id,
          runId: activeId,     // 🔹 koppla till aktiv sträcka direkt
          type: "single",
          width: "1000",
          lat: null,           // 🔹 oplacerad från start
          lng: null,
          segIdx: null,
        },
      ]);
    }

    if (!checked) {
      // städa overlays + töm listan
      Object.values(gatePolylinesRef.current).forEach((pl) => pl.setMap(null));
      gatePolylinesRef.current = {};
      setGates([]);
    }
  },
  [gates.length, createId, activeId] // 🔹 lägg till activeId här
);


  // Sök
  const [query, setQuery] = useState("");
  const [geoCenter, setGeoCenter] = useState(null);

  // SKU-databas
  const [skus, setSkus] = useState([]);
  const [fileName, setFileName] = useState("");

  // Prisfeed (valfritt)
  const [priceMap, setPriceMap] = useState({});
  const [pricesLoaded, setPricesLoaded] = useState(false);

  async function getLogoDataUrl(path = "/logos/logo.png") {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error("Logo not found at " + path);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result); // data:image/png;base64,....
    reader.readAsDataURL(blob);
  });
}

  
  // Ladda inbäddad Excel
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(BUNDLED_PRODUCTS_URL, { cache: "no-store" });
        if (!res.ok) return;
        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheetName = wb.SheetNames.includes("products") ? "products" : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const normalized = normalizeRows(rows);
        setSkus(normalized);
        setFileName("products.xlsx");
      } catch (e) {
        console.error("Fel vid laddning av inbäddad Excel:", e);
      }
    })();
  }, []);

  // === Hämta adress när runs/vertices ändras (debounce lätt) ===
useEffect(() => {
  let tm;
  (async () => {
    const pt = getProjectLatLng();
    if (!pt) { setAddress(""); return; }
    // enkel debounce
    clearTimeout(tm);
    tm = setTimeout(async () => {
      const a = await reverseGeocode(pt.lat, pt.lng);
      setAddress(a || "");
    }, 250);
  })();
  return () => clearTimeout(tm);
  // Lägg beroenden efter hur du muterar geometri:
}, [JSON.stringify(runs)]);


  // (Valfritt) Ladda prisfeed
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/pricefeed", { cache: "no-store" });
        if (!r.ok) throw new Error("pricefeed fail");
        const { prices } = await r.json();
        setPriceMap(prices || {});
      } catch (e) {
        console.warn("Kunde inte läsa prisfeed:", e);
      } finally {
        setPricesLoaded(true);
      }
    })();
  }, []);

  // Trigger map resize vid expand/minimera (hjälper layout på mobil)
  useEffect(() => {
    if (!isLoaded || !window.google || !mapRef.current) return;
    const id = setTimeout(() => {
      try {
        window.google.maps.event.trigger(mapRef.current, "resize");
      } catch {}
    }, 0);
    return () => clearTimeout(id);
  }, [mapExpanded, isLoaded]);

  // Panorera vid geosök
  useEffect(() => {
    if (geoCenter && mapRef.current) {
      mapRef.current.panTo(geoCenter);
      mapRef.current.setZoom(19);
    }
  }, [geoCenter]);



// Mobil-detektion + kartinteraktion
const [isMobile, setIsMobile] = useState(false);


useEffect(() => {
  const mql = window.matchMedia("(max-width: 768px)");
  const onChange = () => setIsMobile(mql.matches);
  onChange();
  if (mql.addEventListener) mql.addEventListener("change", onChange);
  else window.addEventListener("resize", onChange);
  return () => {
    if (mql.removeEventListener) mql.removeEventListener("change", onChange);
    else window.removeEventListener("resize", onChange);
  };
}, []);




  /* =========================
     IMPERATIV POLYLINE-HANTERING
     ========================= */
  const updateMainPolyline = useCallback(() => {
    if (!isLoaded || !window.google || !mapRef.current) return;

    const base = vertices.map((v) => ({ lat: v.lat, lng: v.lng }));
    const effective = closed && base.length >= 2 ? [...base, base[0]] : base;

    if (!effective || effective.length < 2) {
      if (mainPolylineRef.current) {
        mainPolylineRef.current.setMap(null);
        mainPolylineRef.current = null;
      }
      return;
    }

    if (!mainPolylineRef.current) {
      mainPolylineRef.current = new window.google.maps.Polyline({
        strokeColor: ACCENT_RED,
        strokeOpacity: 1,
        strokeWeight: 3,
        clickable: false,
        map: mapRef.current,
      });
    }

    const gPath = effective.map((p) => new window.google.maps.LatLng(p.lat, p.lng));
    mainPolylineRef.current.setPath(gPath);
  }, [isLoaded, vertices, closed, activeId]);

  const setPolylinePathFromVerts = useCallback(
    (verts, closedFlag) => {
      if (!isLoaded || !window.google || !mapRef.current || !mainPolylineRef.current) return;
      const base = verts.map((v) => new window.google.maps.LatLng(v.lat, v.lng));
      const effective = closedFlag && base.length >= 2 ? [...base, base[0]] : base;
      mainPolylineRef.current.setPath(effective);
    },
    [isLoaded]
  );

  const schedulePreview = useCallback(
    (verts, closedFlag) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setPolylinePathFromVerts(verts, closedFlag));
    },
    [setPolylinePathFromVerts]
  );

  useEffect(() => {
    updateMainPolyline();
  }, [updateMainPolyline]);

  // Städa bort polylines vid unmount
  useEffect(() => {
    return () => {
      if (mainPolylineRef.current) {
        mainPolylineRef.current.setMap(null);
        mainPolylineRef.current = null;
      }
      Object.values(staticPolylinesRef.current).forEach((pl) => pl.setMap(null));
      staticPolylinesRef.current = {};
      Object.values(gatePolylinesRef.current).forEach((pl) => pl.setMap(null));
      gatePolylinesRef.current = {};
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Rita frusna (icke-aktiva) sträckor
  useEffect(() => {
    if (!isLoaded || !window.google || !mapRef.current) return;
    const existing = staticPolylinesRef.current;
    const nonActive = runs.filter((r) => r.id !== activeId);
    const wantIds = new Set(nonActive.map((r) => r.id));

    Object.keys(existing).forEach((id) => {
      if (!wantIds.has(id)) {
        existing[id].setMap(null);
        delete existing[id];
      }
    });

    nonActive.forEach((r) => {
      const eff = r.closed && r.vertices.length >= 2 ? [...r.vertices, r.vertices[0]] : r.vertices;
      const path = eff.map((p) => new window.google.maps.LatLng(p.lat, p.lng));
      if (!existing[r.id]) {
        existing[r.id] = new window.google.maps.Polyline({
          strokeColor: ACCENT_RED,
          strokeOpacity: 0.6,
          strokeWeight: 3,
          clickable: false,
          map: mapRef.current,
        });
      }
      existing[r.id].setPath(path);
    });
  }, [isLoaded, runs, activeId]);

  // Historikstack för ångra (lagrar vertices + closed)
  const historyRef = useRef([]);
  const [undoCount, setUndoCount] = useState(0);

  const pushHistory = useCallback(() => {
    historyRef.current.push({ vertices: [...vertices], closed });
    setUndoCount(historyRef.current.length);
  }, [vertices, closed]);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setUndoCount(0);
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const snapshot = historyRef.current.pop();
    setVertices(snapshot.vertices);
    setClosed(snapshot.closed);
    setUndoCount(historyRef.current.length);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [setVertices, setClosed]);

  // Ctrl/Cmd+Z
  useEffect(() => {
    const onKey = (e) => {
      const z = e.key === "z" || e.key === "Z";
      if (z && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  /* ==== Gate placement helpers (håll grind på ett segment) ==== */
  function parseGateTotalWidthMm(g) {
    if (!g) return 0;
    if (g.type === "single") return Number(g.width) || 0;
    const [a, b] = (g.width || "")
      .split("+")
      .map((n) => Number(n) || 0);
    return a + b;
  }
  function gateLengthMeters(g) {
    return parseGateTotalWidthMm(g) / 1000;
  }
  function getSegment(run, segIdx) {
    const verts = run.vertices;
    const n = verts.length;
    if (n < 2) return null;
    const i = segIdx;
    const j = run.closed && i === n - 1 ? 0 : i + 1;
    if (j >= n) return null;
    return { A: verts[i], B: verts[j] };
  }
  function lineFromRunVertices(verts, closed) {
    if (!verts || verts.length < 2) return null;
    const coords = verts.map((v) => [v.lng, v.lat]);
    const eff = closed && verts.length >= 2 ? [...coords, coords[0]] : coords;
    return turf.lineString(eff);
  }
  function nearestSegmentIndex(run, lng, lat) {
    const line = lineFromRunVertices(run.vertices, run.closed);
    const pt = turf.point([lng, lat]);
    const snap = turf.nearestPointOnLine(line, pt, { units: "kilometers" });
    if (snap && Number.isFinite(snap.properties?.index)) return snap.properties.index;

    let bestIdx = 0;
    let best = Infinity;
    const n = run.vertices.length;
    const last = run.closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const a = run.vertices[i];
      const b = run.vertices[(i + 1) % n];
      const seg = turf.lineString([
        [a.lng, a.lat],
        [b.lng, b.lat],
      ]);
      const d = turf.pointToLineDistance(pt, seg, { units: "kilometers" });
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }
  // Ersätt din befintliga snap-funktion med denna
function snapGateToSegment(run, gate, lng, lat) {
  const verts = run?.vertices || [];
  const n = verts.length;
  if (n < 2) return null;

  const gateLenM = (parseGateTotalWidthMm(gate) || 0) / 1000;
  if (!Number.isFinite(gateLenM) || gateLenM <= 0) return null;

  // Bygg segmentlista
  const segs = [];
  const last = run.closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const A = verts[i];
    const B = verts[(i + 1) % n];
    const len = metersBetween(A, B);
    if (len > 0) segs.push({ i, A, B, len });
  }
  if (!segs.length) return null;

  const pt = turf.point([lng, lat]);

  // Hjälpare: avstånd punkt->segment
  const segDistM = (s) => {
    const line = turf.lineString([[s.A.lng, s.A.lat], [s.B.lng, s.B.lat]]);
    return turf.pointToLineDistance(pt, line, { units: "meters" });
  };

  // Hjälpare: vinkel på segment (radianer)
  const segAngle = (s) => Math.atan2(s.B.lat - s.A.lat, s.B.lng - s.A.lng);

  // Hjälpare: vinkel-diff i grader (ignorerar riktning, betraktar parallellt/antiparallellt som lika)
  const angleDiffDeg = (a, b) => {
    let d = Math.abs(a - b);
    if (d > Math.PI) d = 2 * Math.PI - d;
    // parallellt eller anti-parallellt är ok -> reducera till [0, π/2]
    if (d > Math.PI / 2) d = Math.PI - d;
    return (d * 180) / Math.PI;
  };

  // Välj bas-segment: närmast punkt, helst tillräckligt långt
  let best = null, bestD = Infinity;
  const longEnough = segs.filter(s => s.len >= gateLenM);
  const pool = longEnough.length ? longEnough : segs;
  for (const s of pool) {
    const d = segDistM(s);
    if (d < bestD) { bestD = d; best = s; }
  }
  if (!best) return null;

  // Om bas-segment är kort, försök bygga en "rak kedja" av kolinjära grannar
  const ANG_TOL_DEG = 6; // hur mycket vinkeln får avvika och ändå räknas som "rak del"
  const baseAng = segAngle(best);

  // hitta index i "segs"
  const idxInSegs = segs.findIndex(s => s.i === best.i);

  // expandera vänster
  let left = idxInSegs;
  while (left - 1 >= 0) {
    const cand = segs[left - 1];
    if (angleDiffDeg(segAngle(cand), baseAng) <= ANG_TOL_DEG) left--;
    else break;
  }
  // expandera höger
  let right = idxInSegs;
  while (right + 1 < segs.length) {
    const cand = segs[right + 1];
    if (angleDiffDeg(segAngle(cand), baseAng) <= ANG_TOL_DEG) right++;
    else break;
  }

  // Bygg kedjepunkterna (kontinuerlig polyline)
  const chainPts = [];
  chainPts.push([segs[left].A.lng, segs[left].A.lat]);
  for (let k = left; k <= right; k++) {
    chainPts.push([segs[k].B.lng, segs[k].B.lat]);
  }

  // Om vi inte fick någon expansion och segmentet är för kort -> försök ändå snappa och klämma inom segmentet
  let lineForFit = turf.lineString(chainPts);
  let Lm = turf.length(lineForFit, { units: "kilometers" }) * 1000;

  if (Lm < gateLenM) {
    // hela raka kedjan är för kort -> då KAN grinden inte få plats på just den raka delen
    // välj i stället det längsta segmentet i hela run som räcker, om det finns
    if (longEnough.length) {
      const s = longEnough.reduce((acc, v) => (v.len > acc.len ? v : acc), longEnough[0]);
      lineForFit = turf.lineString([[s.A.lng, s.A.lat], [s.B.lng, s.B.lat]]);
      Lm = s.len;
      best = s;
    } else {
      // det finns ingen tillräckligt lång rak del i sträckan -> returnera null
      return null;
    }
  }

  // Projektera din droppunkt på den valda linjen/”kedjan”
  const snapOnChain = turf.nearestPointOnLine(lineForFit, pt, { units: "meters" });
  const centerLng = snapOnChain.geometry.coordinates[0];
  const centerLat = snapOnChain.geometry.coordinates[1];

  // Säkra att grinden får plats: kläm center inom [half, L - half]
  const half = gateLenM / 2;
  const distFromStartM = snapOnChain.properties.location; // meter från chain-start
  let centerM = distFromStartM;
  if (centerM - half < 0) centerM = half;
  if (centerM + half > Lm) centerM = Math.max(half, Lm - half);

  // Slutlig snappad mittpunkt (lat/lng) enligt chain
  const centerKm = centerM / 1000;
  const centerPt = turf.along(lineForFit, centerKm, { units: "kilometers" });

  // Returnera snappad mitt + ett seg-index (behåll kompatibilitet)
  return {
    lat: centerPt.geometry.coordinates[1],
    lng: centerPt.geometry.coordinates[0],
    segIdx: best.i,
  };
}


  // Klick på kartan
  const onMapClick = useCallback(
    (e) => {
      if (!e?.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      // Placera grind-läge?
      if (placingGateId) {
        const run = runs.find((r) => r.id === activeId);
        const g = gates.find((x) => x.id === placingGateId);
        if (!run || !g || run.vertices.length < 2) {
          alert("Rita en sträcka först innan du placerar grind.");
          return;
        }
        const snapped = snapGateToSegment(run, g, lng, lat);
        if (!snapped) {
          alert("Segmentet är kortare än grindens bredd – välj en rakare/längre del.");
          return;
        }
        setGates((prev) =>
          prev.map((x) =>
            x.id === g.id ? { ...x, runId: run.id, lat: snapped.lat, lng: snapped.lng, segIdx: snapped.segIdx } : x
          )
        );
        setPlacingGateId(null);
        return;
      }

      // Normalt ritläge
      if (closed) return;
      pushHistory();
      setVertices((prev) => [...prev, { lat, lng }]);
    },
    [placingGateId, runs, activeId, closed, pushHistory, setVertices, gates]
  );

  // Ny sträcka
  const addStretch = useCallback(() => {
  // 1) Skapa id först
  const id = createId();

  // 2) Lägg till sträckan
  setRuns(prev => {
    const maxSeq = prev.reduce((m, r) => Math.max(m, r.seq || 0), 0);
    return [...prev, { id, seq: maxSeq + 1, vertices: [], closed: false }];
  });

  // 3) Gör den nyss skapade sträckan aktiv (UTANFÖR setRuns)
  setActiveId(id);

  // 4) Städ/töm förhands-linje
  clearHistory();
  if (mainPolylineRef.current) mainPolylineRef.current.setPath([]);
}, [createId, clearHistory]);


  // Byt aktiv sträcka
  const activateRun = useCallback(
    (id) => {
      setActiveId(id);
      clearHistory();
    },
    [clearHistory]
  );

  // Ta bort en sträcka
  const removeRun = useCallback(
    (id) => {
      setRuns((prev) => {
        const filtered = prev.filter((r) => r.id !== id);

        // städa ev. statisk polyline
        const pl = staticPolylinesRef.current[id];
        if (pl) {
          pl.setMap(null);
          delete staticPolylinesRef.current[id];
        }

        if (id === activeId) {
          if (filtered.length > 0) {
            setActiveId(filtered[0].id);
          } else {
            const newId = createId();
            setActiveId(newId);
            return [{ id: newId, seq: 1, vertices: [], closed: false }];
          }
          if (mainPolylineRef.current) mainPolylineRef.current.setPath([]);
        }
        return filtered;
      });
      clearHistory();
    },
    [activeId, createId, clearHistory]
  );

  // Rensa ALLT
  const reset = useCallback(() => {
    clearHistory();
    if (mainPolylineRef.current) {
      mainPolylineRef.current.setPath([]);
      mainPolylineRef.current.setMap(null);
      mainPolylineRef.current = null;
    }
    Object.values(staticPolylinesRef.current).forEach((pl) => pl.setMap(null));
    staticPolylinesRef.current = {};
    Object.values(gatePolylinesRef.current).forEach((pl) => pl.setMap(null));
    gatePolylinesRef.current = {};
    const id = createId();
    setRuns([{ id, seq: 1, vertices: [], closed: false }]);
    setActiveId(id);
    setGates([]);
    setPlacingGateId(null);
  }, [createId, clearHistory]);

  const isClosable = !closed && vertices.length >= 3;
  const closeLoop = useCallback(() => {
    if (!closed && vertices.length >= 3) {
      pushHistory();
      setClosed(true);
    }
  }, [closed, vertices.length, pushHistory]);

  // Autocomplete
  const onPlaceChanged = useCallback(() => {
  try {
    if (!autoRef.current) return;
    const place = autoRef.current.getPlace();
    const loc = place?.geometry?.location;
    if (!loc) return;

    const lat = loc.lat();
    const lng = loc.lng();
    const formatted = place.formatted_address || "";

    // Uppdatera UI
    setGeoCenter({ lat, lng });
    setQuery(formatted);

    // 🗂️ Spara i Supabase via server-route
    fetch("/api/search-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: formatted,         // vad användaren (i praktiken) sökte/fick
        result: formatted,    // formaterad adress från Places
        lat,
        lng,
        source: "place_changed",
      }),
    }).catch(() => {}); // tysta nätverksfel – påverkar inte UX
  } catch {
    // no-op
  }
}, []);


  // Sök-knapp (Geocoder)
// Sök-knapp (Geocoder) – med GA-event + Supabase-logg
const search = useCallback(async () => {
  if (!isLoaded || !window.google || !query.trim()) return;

  const geocoder = new window.google.maps.Geocoder();
  geocoder.geocode({ address: query, region: "SE" }, (resultsArr, status) => {
    if (status === "OK" && resultsArr && resultsArr[0]) {
      const loc = resultsArr[0].geometry.location;
      const lat = loc.lat();
      const lng = loc.lng();
      const formatted = resultsArr[0].formatted_address || query;

      // Uppdatera UI
      setGeoCenter({ lat, lng });
      setQuery(formatted);

      // 🗂️ Supabase-logg (träff)
      fetch("/api/search-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: query,           // vad användaren skrev
          result: formatted,  // första träffens formaterade adress
          lat,
          lng,
          source: "geocoder",
        }),
      }).catch(() => {});
    } else {
      // (valfritt) GA/GTM “no_result”
      // gaEvent("search", { q: query, result: "no_result" });

      // 🗂️ Supabase-logg (ingen träff)
      fetch("/api/search-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: query,
          result: "no_result",
          lat: null,
          lng: null,
          source: "geocoder",
        }),
      }).catch(() => {});

      alert("Hittade ingen träff på den adressen.");
    }
  });
}, [isLoaded, query]);


  // (valfritt) filinläsning via UI
  const onFile = useCallback(async (evt) => {
    const f = evt.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames.includes("products") ? "products" : wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    let rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    rows = rows.map((r) => {
      const obj = {};
      for (const k of Object.keys(r)) {
        const nk = k.toString().trim().toLowerCase().replace(/\s+/g, "_");
        obj[nk] = r[k];
      }
      return obj;
    });
    const normalized = normalizeRows(rows);
    setSkus(normalized);
    alert(`Läste in ${normalized.length} rader från ${f.name}`);
  }, []);

  // Prislookup
  const getUnitPrice = useCallback(
    (sku, excelPrice) => {
      const key = String(sku || "").trim().toLowerCase();
      const fromFeed = key ? priceMap[key] : undefined;
      if (fromFeed !== undefined && Number.isFinite(Number(fromFeed))) return Number(fromFeed);
      const p = Number(excelPrice);
      return Number.isFinite(p) ? p : undefined;
    },
    [priceMap]
  );

  /* === RESULTAT över alla sträckor, med grind-justeringar per sträcka === */
  function getCornerIndicesForRun(verts, closedFlag) {
    const out = [];
    if (!verts || verts.length < 3) return out;
    const n = verts.length;
    if (closedFlag) {
      for (let i = 0; i < n; i++) {
        const prev = verts[(i - 1 + n) % n],
          curr = verts[i],
          next = verts[(i + 1) % n];
        const ang = turningAngleDeg(prev, curr, next);
        if (ang > CORNER_THRESHOLD) out.push(i);
      }
    } else {
      for (let i = 1; i < n - 1; i++) {
        const ang = turningAngleDeg(verts[i - 1], verts[i], verts[i + 1]);
        if (ang > CORNER_THRESHOLD) out.push(i);
      }
    }
    return out;
  }
// Ersätt din befintliga applyGateAdjustments med denna version
function applyGateAdjustments(run, base, gatesForRun) {
  if (!base || !run?.vertices?.length || !gatesForRun?.length) return base;

  const verts = run.vertices;
  const closedFlag = run.closed;
  const line = lineFromRunVertices(verts, closedFlag);
  if (!line) return base;

  // Utgångsvärden från basberäkningen
  let cornerCount = base.cornerPosts;
  let endCount = base.endPosts;                // spåra ändstolpar separat
  let intermediateCount = base.intermediatePosts;

  // stays byggs från basen (end = 1, corner = 2)
  let stays = base.endPosts + 2 * base.cornerPosts;

  const cornerIdx = getCornerIndicesForRun(verts, closedFlag);
  const CLOSE_CORNER_TOL = 0.8; // m – “ersätter stolpen” om en grind-ände ligger inom detta
  const NEAR_CORNER_RADIUS = 3; // m – nära hörn/ände => grinden ger 1 stag i stället för 2

  // Bygg sträckans segment
  const segs = [];
  const n = verts.length;
  const last = closedFlag ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const A = verts[i];
    const B = verts[(i + 1) % n];
    const len = metersBetween(A, B);
    if (len > 0) segs.push({ i, A, B, len });
  }
  if (!segs.length) return base;

  // Hitta segment för grind
  const getSegmentForGate = (g) => {
    if (Number.isInteger(g?.segIdx)) {
      const s = segs.find((x) => x.i === g.segIdx);
      if (s) return s;
    }
    if (Number.isFinite(g?.lat) && Number.isFinite(g?.lng)) {
      const pt = turf.point([g.lng, g.lat]);
      let best = null, bestD = Infinity;
      for (const s of segs) {
        const line = turf.lineString([[s.A.lng, s.A.lat], [s.B.lng, s.B.lat]]);
        const d = turf.pointToLineDistance(pt, line, { units: "meters" });
        if (d < bestD) { bestD = d; best = s; }
      }
      return best;
    }
    return null;
  };

  // för betongkompensation
  let removedInterPostsFromGates = 0;

  for (const g of gatesForRun) {
    const isPlaced = Number.isFinite(g?.lat) && Number.isFinite(g?.lng) || Number.isInteger(g?.segIdx);

    // ✅ NYTT: oplacerad grind → räkna direkt 2 stag, gör inget annat
    if (!isPlaced) {
      stays += 2;
      continue;
    }

    const seg = getSegmentForGate(g);
    const totalWidthM = (parseGateTotalWidthMm(g) || 0) / 1000;
    const half = totalWidthM / 2;

    if (!seg) {
      // fallback om segment inte kan hittas trots pos/segIdx
      stays += 2;
      continue;
    }

    // Projektera mitt och räkna ut grindens ändar
    const segLine = turf.lineString([[seg.A.lng, seg.A.lat], [seg.B.lng, seg.B.lat]]);
    const pt = turf.point([g.lng, g.lat]);
    const snap = turf.nearestPointOnLine(segLine, pt, { units: "meters" });
    const Lm = seg.len;
    let centerM = snap.properties.location;
    if (centerM - half < 0) centerM = half;
    if (centerM + half > Lm) centerM = Math.max(half, Lm - half);
    const startM = centerM - half;
    const endM   = centerM + half;

    const pStart = turf.along(segLine, startM / 1000, { units: "kilometers" });
    const pEnd   = turf.along(segLine, endM   / 1000, { units: "kilometers" });
    const gateStart = { lat: pStart.geometry.coordinates[1], lng: pStart.geometry.coordinates[0] };
    const gateEnd   = { lat: pEnd.geometry.coordinates[1],   lng: pEnd.geometry.coordinates[0] };

    // Avstånd från grindens ÄNDAR till hörn/ändar
    let minCornerDist = Infinity;
    for (const ci of cornerIdx) {
      const d1 = metersBetween(verts[ci], gateStart);
      const d2 = metersBetween(verts[ci], gateEnd);
      const d = Math.min(d1, d2);
      if (d < minCornerDist) minCornerDist = d;
    }

    let minEndDist = Infinity;
    if (!closedFlag && verts.length >= 2) {
      const first = verts[0];
      const lastV = verts[verts.length - 1];
      const d1s = metersBetween(first, gateStart);
      const d1e = metersBetween(first, gateEnd);
      const d2s = metersBetween(lastV, gateStart);
      const d2e = metersBetween(lastV, gateEnd);
      minEndDist = Math.min(d1s, d1e, d2s, d2e);
    }

    const atCorner = minCornerDist <= CLOSE_CORNER_TOL;
    const atEnd    = minEndDist    <= CLOSE_CORNER_TOL;

    // Om grinden ersätter stolpe: ta bort 1 stag
    if (atCorner && cornerCount > 0) {
      cornerCount -= 1;
      stays -= 1;
    }
    if (atEnd && endCount > 0) {
      endCount -= 1;
      stays -= 1;
    }

    // Ta bort 1–2 mellanstolpar beroende på grindbredd (endast när placerad)
    const removeInter = totalWidthM <= 1.4 ? 1 : 2;
    const canRemove = Math.min(removeInter, Math.max(0, intermediateCount));
    intermediateCount = Math.max(0, intermediateCount - removeInter);
    removedInterPostsFromGates += canRemove;

    // Stag från placerad grind (nära hörn/änd → 1, annars 2)
    const nearCornerOrEnd = Math.min(minCornerDist, minEndDist) <= NEAR_CORNER_RADIUS;
    stays += nearCornerOrEnd ? 1 : 2;
  }

  return {
    ...base,
    endPosts: endCount,
    cornerPosts: cornerCount,
    intermediatePosts: intermediateCount,
    stays,
    removedInterPostsFromGates,
  };
}




const mapOptions = useMemo(() => ({
  mapTypeId: "satellite",
  clickableIcons: false,
  maxZoom: 20,
  minZoom: 3,
  tilt: 0,
  gestureHandling: "greedy",  // alltid pan/zoom
  keyboardShortcuts: false,
  fullscreenControl: false,
  streetViewControl: false,
  mapTypeControl: false,
}), []);





  const results = useMemo(() => {
  const acc = {
    lengthMeters: 0,
    endPosts: 0,
    cornerPosts: 0,
    intermediatePosts: 0,
    rolls: 0,            // sätts efter loopen
    stays: 0,
    stayWireMeters: 0,   // summera meter
    stayWireRolls: 0,    // sätts efter loopen
    barbwireMeters: 0,
    barbwireRolls: 0,
  };

  const add = (r) => {
    acc.lengthMeters       += r.lengthMeters;
    acc.endPosts           += r.endPosts;
    acc.cornerPosts        += r.cornerPosts;
    acc.intermediatePosts  += r.intermediatePosts;
    acc.stays              += r.stays;

    // ✅ Viktigt: summera meter istället för rullar
    acc.stayWireMeters     += r.stayWireMeters;
    acc.barbwireMeters     += r.barbwireMeters;
    // ⚠️ Lägg INTE till r.rolls eller r.stayWireRolls här
  };

  runs.forEach((run) => {
    const base = computeAll(run.vertices, run.closed);

    // Ta med både placerade och oplacerade grindar om includeGate är på
    const gatesForRun = includeGate
      ? gates.filter((g) => g.runId === run.id)
      : [];

    const adj = applyGateAdjustments(run, base, gatesForRun);
    add(adj);
  });

  // ✅ Ceila först efter totalen
  acc.rolls          = Math.ceil(acc.lengthMeters   / ROLL_LENGTH_M);
  acc.stayWireRolls  = Math.ceil(acc.stayWireMeters / STAY_WIRE_ROLL_M);
  acc.barbwireRolls  = Math.ceil(acc.barbwireMeters / BARBWIRE_ROLL_M);

  return acc;
}, [runs, gates, includeGate]);



  // Plintbetong
  const totalPosts = useMemo(
    () => results.endPosts + results.cornerPosts + results.intermediatePosts,
    [results]
  );
  const gateConcrete = useMemo(
    () => (includeGate ? gates.filter((g) => Number.isFinite(g.lat)).length * GATE_CONCRETE_PER_GATE : 0),
    [includeGate, gates]
  );
  const concreteQty = useMemo(() => {
    if (!includeConcrete) return 0;
    return CONCRETE_PER_POST * totalPosts + gateConcrete;
  }, [includeConcrete, totalPosts, gateConcrete]);

  const barbwireQty = useMemo(() => {
    if (!includeBarbwire) return 0;
    return results.barbwireRolls || 0;
  }, [includeBarbwire, results.barbwireRolls]);

  /* ===== Offert-rader (lineItems) ===== */
  const lineItems = useMemo(() => {
    // 1) Matcha SKU:er för stängseldelar
    const rollSku = pickSku(skus, {
      product_type: "fence_roll",
      height_mm: height,
      color,
      mesh_mm: mesh,
      roll_length_m: ROLL_LENGTH_M,
    });
    const endSku = pickSku(skus, { product_type: "post_end", height_mm: height, color });
    const cornerSku = pickSku(skus, { product_type: "post_corner", height_mm: height, color });
    const intSku = pickSku(skus, { product_type: "post_intermediate", height_mm: height, color });
    const staySku =
      pickSku(skus, { product_type: "stay", color }) ||
      pickSku(skus, { product_type: "stag", color }) ||
      pickSku(skus, { product_type: "brace", color });
    const stayWireSku =
      pickSku(skus, { product_type: "stay_wire", color }) ||
      pickSku(skus, { product_type: "stagtrad", color }) ||
      pickSku(skus, { product_type: "stagtråd", color }) ||
      pickSku(skus, { product_type: "guy_wire", color });
    const barbwireSku =
      pickSku(skus, { product_type: "barbwire", color }) ||
      pickSku(skus, { product_type: "taggtrad", color }) ||
      pickSku(skus, { product_type: "taggtråd", color });

    // 2) Kvantiteter
    const qtyRolls = results.rolls || 0;
    const qtyEnd = results.endPosts || 0;
    const qtyCorner = results.cornerPosts || 0;
    const qtyInt = results.intermediatePosts || 0;
    const qtyStays = results.stays || 0;
    const qtyStayWireRolls = results.stayWireRolls || 0;
    const qtyBarbwireRolls = barbwireQty;

    // 3) Bygg rader
    const rows = [];
    if (rollSku) rows.push({ ...rollSku, qty: qtyRolls });
    else rows.push({ sku: "—", product_type: "fence_roll", name: "Stängselrulle (saknas i Excel)", qty: qtyRolls });

    if (qtyEnd > 0)
      rows.push(
        endSku ? { ...endSku, qty: qtyEnd } : { sku: "—", product_type: "post_end", name: "Ändstolpe (saknas i Excel)", qty: qtyEnd }
      );
    if (qtyCorner > 0)
      rows.push(
        cornerSku
          ? { ...cornerSku, qty: qtyCorner }
          : { sku: "—", product_type: "post_corner", name: "Hörnstolpe (saknas i Excel)", qty: qtyCorner }
      );
    if (qtyInt > 0)
      rows.push(
        intSku
          ? { ...intSku, qty: qtyInt }
          : { sku: "—", product_type: "post_intermediate", name: "Mellanstolpe (saknas i Excel)", qty: qtyInt }
      );

    if (qtyStays > 0)
      rows.push(
        staySku ? { ...staySku, qty: qtyStays } : { sku: "—", product_type: "stay", name: "Stag 3,5 m (saknas i Excel)", qty: qtyStays }
      );
    if (qtyStayWireRolls > 0)
      rows.push(
        stayWireSku
          ? { ...stayWireSku, qty: qtyStayWireRolls }
          : { sku: "—", product_type: "stay_wire", name: "Stagtråd 50 m (saknas i Excel)", qty: qtyStayWireRolls }
      );

    if (includeBarbwire && qtyBarbwireRolls > 0)
      rows.push(
        barbwireSku
          ? { ...barbwireSku, qty: qtyBarbwireRolls }
          : { sku: "—", product_type: "barbwire", name: "Taggtråd 250 m (saknas i Excel)", qty: qtyBarbwireRolls }
      );

    // 4) Plintbetong
    if (includeConcrete && concreteQty > 0) {
      const concreteSku = pickSku(skus, { product_type: "concrete" });
      rows.push(
        concreteSku
          ? { ...concreteSku, qty: concreteQty }
          : { sku: "—", product_type: "concrete", name: "Plintbetong (saknas i Excel)", qty: concreteQty }
      );
    }

    // 5) Flera grindar
    if (includeGate && gates.length > 0) {
      for (const g of gates) {
        const gateSku =
          g.type === "single"
            ? pickGateSku(skus, { type: "single", height_mm: height, color, widthSingle: Number(g.width) })
            : pickGateSku(skus, { type: "double", height_mm: height, color, widthPairLabel: g.width });

        const label =
          g.type === "single"
            ? `Grind (enkel ${g.width} mm)`
            : `Grind (dubbel ${g.width.replace("+", " + ")} mm)`;

        rows.push(
          gateSku
            ? { ...gateSku, qty: 1 }
            : {
                sku: "—",
                product_type: g.type === "single" ? "gate_single" : "gate_double",
                name: `${label} – saknas i Excel`,
                qty: 1,
              }
        );
      }
    }

    return rows;
  }, [
    skus,
    height,
    color,
    mesh,
    results,
    includeConcrete,
    concreteQty,
    includeBarbwire,
    barbwireQty,
    includeGate,
    gates,
  ]);

  const hasPositiveLineItems = useMemo(
    () => lineItems.some((row) => Number(row?.qty || 0) > 0),
    [lineItems]
  );

/* ===== Kassa (proxy mot ert API) ===== */
const [creatingCart, setCreatingCart] = useState(false);

const goToCheckout = useCallback(async () => {
  if (creatingCart) return;
  setCreatingCart(true);

  // Öppna ny flik direkt (popup-säkert) och visa loader
  const newTab = window.open("about:blank", "_blank");
  if (!newTab) {
    alert("Kunde inte öppna ny flik. Tillåt popups för denna sida.");
    setCreatingCart(false);
    return;
  }
  renderLoadingPage(newTab);

  try {
    // 1) Konsolidera rader till {sku, quantity}
    const products = consolidateItems(lineItems);
    if (!products.length) {
      alert("Inga giltiga artiklar att lägga i varukorg.");
      newTab.close();
      return;
    }

    // 2) Räkna totalvärde (inkl. moms) för eventet
    const grand = lineItems.reduce((acc, r) => {
      const unit = getUnitPrice(r.sku, r.price_sek);
      const qty = Number(r.qty || 0);
      if (unit !== undefined && Number.isFinite(qty) && qty > 0) {
        return acc + unit * qty;
      }
      return acc;
    }, 0);

    // ⬇️ Logga ritningen i Supabase (blockerar inte flödet om det skulle fela)
    try {
      // ✅ Bygg Static Maps-URL med enbart runs (inte gates)
      let mapUrlForLog = null;
      try {
        mapUrlForLog = buildStaticMapUrl({ runs });
      } catch (e) {
        console.warn("buildStaticMapUrl failed:", e);
      }

      // Bygg share-länk av nuvarande state
      const shareUrl = buildShareUrl({
        runs,
        gates,
        height,
        color,
        mesh,
        includeConcrete,
        includeBarbwire,
        includeGate,
        address,
        basePath: "/",
      });

      // Spara snapshot och logga ev. fel från API-routen
      const logRes = await saveProjectSnapshot({
        action: "create_cart",
        runs,
        gates,
        height, color, mesh,
        includeConcrete, includeBarbwire, includeGate,
        results,
        lineItems: products, // konsoliderade items
        address,
        mapImageUrl: mapUrlForLog, // kan bli null, raden sparas ändå
        shareUrl, 
      });

      if (!logRes?.ok) {
        console.warn("saveProjectSnapshot: not saved", logRes);
      }
    } catch (e) {
      console.error("snapshot block crashed:", e);
      // Fortsätt utan att stoppa checkout-flödet
    }

    // 3) Skapa varukorg via din API-proxy
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Kundvagn kunde inte skapas (${res.status}). ${txt}`);
    }

    const { checkoutUrl } = await res.json();
    if (!checkoutUrl) {
      alert("API-svar saknar checkoutUrl.");
      newTab.close();
      return;
    }

    // 4) 🔔 Skicka event till GA4/GTM innan navigering
    gaEvent("cart_create", {
      items: products.length,
      value_sek: Math.round(grand || 0),
      currency: "SEK",
    });

    // 5) Navigera nya fliken till kassan
    newTab.location.assign(checkoutUrl);
    try { newTab.opener = null; } catch {}
  } catch (err) {
    console.error(err);
    newTab.close();
    alert("Det gick inte att skapa varukorgen. Se konsolen för detaljer.");
  } finally {
    setCreatingCart(false);
  }
}, [
  lineItems,
  creatingCart,
  consolidateItems,
  getUnitPrice,
  runs,
  gates,
  height,
  color,
  mesh,
  includeConcrete,
  includeBarbwire,
  includeGate,
  results,
  address,
]);




function renderLoadingPage(win) {
  const html = `
<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Skapar varukorg…</title>
<style>
  :root{
    --bg:#061739; --card:#040d25; --text:#e6eefc; --muted:#9fb2d9;
    --brand:#2563eb; --accent:#ffffff;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{
    margin:0; background: radial-gradient(1200px 800px at 80% -10%, #13306b22, transparent), var(--bg);
    color:var(--text); font:16px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;
    display:grid; place-items:center;
  }
  .wrap{
    width:min(560px,92vw); background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,0));
    border:1px solid rgba(255,255,255,.08); border-radius:24px; padding:28px 28px 22px;
    box-shadow:0 10px 40px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06);
    backdrop-filter:blur(6px); text-align:center;
  }
  .brand{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:18px}
  .brand img{width:28px;height:28px;object-fit:contain}
  .brand span{font-weight:600;letter-spacing:.2px}
  h1{font-size:22px;margin:8px 0 6px}
  p{margin:0;color:var(--muted)}
  .loader{position:relative;width:96px;height:96px;margin:24px auto 18px;filter:drop-shadow(0 4px 20px rgba(37,99,235,.35))}
  .ring{position:absolute;inset:0;border-radius:50%;border:4px solid transparent;border-top-color:var(--brand);animation:spin 1.2s linear infinite}
  .ring2{position:absolute;inset:10px;border-radius:50%;border:4px solid transparent;border-right-color:var(--accent);animation:spin 1.6s linear infinite reverse;opacity:.85}
  .dot{position:absolute;top:50%;left:50%;width:10px;height:10px;background:var(--brand);border-radius:50%;
       transform:translate(-50%,-50%);animation:pulse 1.4s ease-in-out infinite;box-shadow:0 0 0 rgba(37,99,235,.6)}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(37,99,235,.6)}70%{box-shadow:0 0 0 18px rgba(37,99,235,0)}100%{box-shadow:0 0 0 0 rgba(37,99,235,0)}}
  .pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.08);font-size:13px;margin:2px 4px}
  .grid{display:flex;flex-wrap:wrap;justify-content:center;margin-top:4px}
  .hint{font-size:12px;opacity:.7;margin-top:14px}
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <span>Nils Ahlgren AB - Stängselplaneraren</span>
    </div>

    <div class="loader" role="status" aria-live="polite">
      <div class="ring"></div>
      <div class="ring2"></div>
      <div class="dot"></div>
    </div>

    <h1>Skapar varukorg…</h1>
    <p>Vi räknar ihop artiklarna och förbereder din kassa.</p>

    <div class="grid" aria-hidden="true">
      <div class="pill">✅ Antal beräknas</div>
      <div class="pill">📦 Lägger artiklar i varukorgen</div>
    </div>

    <div class="hint">Detta kan ta några sekunder.</div>
  </div>
</body>
</html>
`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}



// Svensk valutaformattering
const fmtSEK = (v) =>
  (v === undefined || v === null || !Number.isFinite(Number(v)))
    ? ""
    : new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(Number(v));

// Försök hämta SVG och rasterisera till PNG-dataURL (fortsätter utan logga om CORS blockerar)
async function fetchSvgAsPngDataURL(svgUrl, targetW = 360, targetH = 100) {
  try {
    const res = await fetch(svgUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("logo fetch failed");
    const svgText = await res.text();
    const blob = new Blob([svgText], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.crossOrigin = "anonymous";
    const dataUrl = await new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          resolve(canvas.toDataURL("image/png"));
        } catch (e) {
          reject(e);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = reject;
      img.src = url;
    });

    return dataUrl;
  } catch {
    return null; // ingen logga? vi kör vidare ändå
  }
}

// Rita "pills" (chips) på en rad som bryts automatiskt
function drawPills(doc, items, opts = {}) {
  const {
    x0,                // start-x
    y0,                // start-y (från överkant)
    maxWidth,          // maxbredd för raden (t.ex. W - P.left - P.right)
    gap = 8,           // mellanrum mellan pill
    padX = 10,         // inre padding X
    padY = 6,          // inre padding Y
    r = 8,             // hörnradie
    fontSize = 12,     // textstorlek
    fill = [240, 245, 255],    // pill-bakgrund (ljus blå/grå)
    stroke = [203, 213, 225],  // pill-kant (slate-300)
    textColor = [15, 23, 42],  // textfärg (INK)
    lineGap = 8,       // radavstånd mellan pill-rader
    lineWidth = 0.6,   // kantlinje
  } = opts;

  doc.setFontSize(fontSize);
  doc.setDrawColor(...stroke);
  doc.setLineWidth(lineWidth);

  let x = x0;
  let y = y0;
  const rowH = fontSize + padY * 2;

  items.forEach((label) => {
    const textW = doc.getTextWidth(label);
    const pillW = textW + padX * 2;

    // Radbryt om pillen inte får plats
    if (x + pillW > x0 + maxWidth) {
      x = x0;
      y += rowH + lineGap;
    }

    // Rita pill
    doc.setFillColor(...fill);
    doc.roundedRect(x, y, pillW, rowH, r, r, "FD");

    // Text (lätt baseline-tweak)
    doc.setTextColor(...textColor);
    doc.text(label, x + padX, y + rowH - padY - 2);

    x += pillW + gap;
  });

  return y + rowH; // returnera nederkantens y (ifall du vill fortsätta under)
}

async function saveProjectSnapshot(payload) {
  try {
    const res = await fetch("/api/save-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("saveProjectSnapshot failed:", res.status, txt);
      return { ok: false, status: res.status, error: txt };
    }
    const json = await res.json().catch(() => ({}));
    return { ok: true, ...json };
  } catch (e) {
    console.error("saveProjectSnapshot error:", e);
    return { ok: false, error: String(e) };
  }
}


  /* ===== PDF ===== */
/* ===== PDF ===== */
const generatePdf = useCallback(async () => {
  if (!lineItems.length) {
    alert("Inga rader att offerera. Kontrollera att artiklar är inlästa och att du ritat en sträcka.");
    return;
  }

    const pdfLineItems = mergeRowsBySku(lineItems);
  if (!pdfLineItems.length) {
    alert("Inga giltiga rader att offerera efter konsolidering av artiklar.");
    return;
  }

  // --- Färger & helpers ---
  const BLUE = [15, 61, 145];
  const TEXT = [17, 24, 39];
  const MUTED = [107, 114, 128];
  const RULE = [229, 231, 235];
  const ROW_ALT = [247, 249, 252];

  const formatSEK = (n) =>
    typeof n === "number"
      ? new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(n)
      : "";

  // Hjälp: hämta valfri SVG som PNG (för loggan)
  const fetchSvgAsPngDataURL = async (url, targetW = 360, targetH = 100) => {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) return null;
      const svgText = await res.text();
      const blob = new Blob([svgText], { type: "image/svg+xml" });
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.src = blobUrl;
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
      const scale = Math.min(targetW / img.width, targetH / img.height);
      const w = img.width * scale, h = img.height * scale;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(w));
      canvas.height = Math.max(1, Math.floor(h));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobUrl);
      return canvas.toDataURL("image/png");
    } catch { return null; }
  };

  const unitPrice = (sku, excelPrice) => {
    const v = getUnitPrice(sku, excelPrice);
    return v === undefined ? undefined : Number(v);
  };

  // --- Static Maps helpers (redan i din fil; använd dem du har) ---
  // encodeSigned / encodePolyline / buildStaticMapUrl / fetchImageDataUrl
  // OBS: buildStaticMapUrl ska nu anropas med { runs, gates }

  // === Förbered karta/URL en gång (används både i PDF och i Supabase-logg) ===
  let staticUrl = null;
  try {
    staticUrl = buildStaticMapUrl({ runs, gates }); // <-- VIKTIGT: gates med
  } catch (e) {
    console.warn("buildStaticMapUrl failed:", e);
  }

  // --- PDF init ---
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const P = { left: 44, right: 44 };

  // Topp-linje
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 6, "F");

  // Logga
  const logoDataUrl = await getLogoDataUrl("/logos/logo.png");
  const logoW = 140;
  const logoH = (logoW * 103.5) / 520.5;
  doc.addImage(logoDataUrl, "PNG", W - P.right - logoW, 18, logoW, logoH, undefined, "FAST");

  // Rubrik + datum + adress
  doc.setTextColor(...TEXT);
  doc.setFontSize(20);
  doc.text("Offert – Stängsel", P.left, 48);
  doc.setTextColor(...MUTED);
  doc.setFontSize(11);
  const now = new Date();
  doc.text(`Datum: ${now.toLocaleDateString("sv-SE")} ${now.toLocaleTimeString("sv-SE")}`, P.left, 66);
  doc.setFontSize(11);
  doc.setTextColor(80, 90, 110);
  doc.text(address || "Adress: –", P.left, 84);

  // Spec pills
  doc.setFont(undefined, "normal");
  const bullets = [
    `Höjd: ${height} mm`,
    `Färg: ${color}`,
    `Maska: ${mesh} mm`,
    `Längd: ${results.lengthMeters.toFixed(2)} m`,
    `Rullar á 25 m: ${results.rolls} st`,
  ];
  const pillsBottomY = drawPills(doc, bullets, {
    x0: P.left, y0: 94, maxWidth: W - P.left - P.right,
    fontSize: 12, gap: 8, padX: 10, padY: 6, r: 8,
    fill: [240, 245, 255], stroke: [203, 213, 225], textColor: [...TEXT],
  });
  let by = pillsBottomY + 12;

  // Avdelare
  doc.setDrawColor(...RULE);
  doc.setLineWidth(1);
  doc.line(P.left, by + 8, W - P.right, by + 8);

  // Tabell
  const bodyRows = pdfLineItems.map((r) => {
    const unit = unitPrice(r.sku, r.price_sek);
    const qty = Number(r.qty || 0);
    const rowTotal = (unit !== undefined && Number.isFinite(qty)) ? unit * qty : undefined;
    return [
      r.sku || "—",
      r.name || r.product_type || "—",
      String(qty),
      unit === undefined ? "" : formatSEK(unit),
      rowTotal === undefined ? "" : formatSEK(rowTotal),
    ];
  });

  const FOOTER_HEIGHT = 120;

  autoTable(doc, {
    startY: by + 26,
    margin: { left: P.left, right: P.right, bottom: FOOTER_HEIGHT + 16 },
    head: [["Artikelnummer", "Benämning", "Antal", "à-pris (SEK)", "Radsumma (SEK)"]],
    body: bodyRows,
    theme: "grid",
    styles: { fontSize: 10, textColor: TEXT, lineColor: RULE, lineWidth: 0.6, cellPadding: 6, valign: "middle", halign: "left" },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], lineColor: BLUE, lineWidth: 0.6, fontStyle: "bold" },
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 190 },
      2: { cellWidth: 45, halign: "right" },
      3: { cellWidth: 95, halign: "right" },
      4: { cellWidth: 110, halign: "right" },
    },
    didDrawPage: (data) => {
      const yTop = H - FOOTER_HEIGHT + 8;
      doc.setDrawColor(...RULE);
      doc.setLineWidth(1);
      doc.line(P.left, yTop, W - P.right, yTop);
      let fy = yTop + 24;
      doc.setTextColor(...TEXT);
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("Nils Ahlgren Aktiebolag", P.left, fy);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...MUTED);
      doc.setFontSize(10);
      [
        "Org.nummer: 556032-8527",
        "Rörvägen 16, 136 50 Jordbro",
        "Telefon 08-500 125 80",
        "Kontakt/Order info@nilsahlgren.se",
      ].forEach((line) => { fy += 16; doc.text(line, P.left, fy); });
      doc.setTextColor(...MUTED);
      doc.setFontSize(10);
      doc.text(`Sida ${data.pageNumber}`, W - P.right, H - 22, { align: "right" });
    },
  });

  // Summering
  const lastY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || (by + 26);
  const gross = pdfLineItems.reduce((acc, r) => {
    const unit = unitPrice(r.sku, r.price_sek);
    const q = Number(r.qty || 0);
    return (unit !== undefined && Number.isFinite(q)) ? acc + unit * q : acc;
  }, 0);
  const net = gross / 1.25;
  const vat = gross - net;
  const grand = gross;

  const sumBoxW = 260;
  const sumBoxX = W - P.right - sumBoxW;
  const maxSumBoxTop = H - FOOTER_HEIGHT - 130;
  const sumBoxY = Math.min(lastY + 20, maxSumBoxTop);
  doc.roundedRect(sumBoxX, sumBoxY, sumBoxW, 110, 8, 8, "S");
  const lineH = 18;
  let ty = sumBoxY + 24;
  doc.setTextColor(...TEXT);
  doc.setFontSize(12);
  doc.text("Delsumma (exkl. moms)", sumBoxX + 14, ty);
  doc.text(formatSEK(net), sumBoxX + sumBoxW - 14, ty, { align: "right" });
  ty += lineH;
  doc.setTextColor(...MUTED);
  doc.text("Moms (25%)", sumBoxX + 14, ty);
  doc.text(formatSEK(vat), sumBoxX + sumBoxW - 14, ty, { align: "right" });
  ty += lineH;
  doc.setDrawColor(...RULE);
  doc.line(sumBoxX + 14, ty, sumBoxX + sumBoxW - 14, ty);
  ty += 22;
  doc.setTextColor(...TEXT);
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("Totalt (inkl. moms)", sumBoxX + 14, ty);
  doc.text(formatSEK(grand), sumBoxX + sumBoxW - 14, ty, { align: "right" });
  doc.setFont(undefined, "normal");

  // Disclaimer + montage
  const DISCLAIMER_TEXT =
    "Priser och kvantiteter baseras på uppgifter i verktyget vid utskriftstillfället. " +
    "Pris- och produktförändringar kan ske utan föregående avisering. " +
    "Detta dokument är inte en bindande offert eller ett avtal. " +
    "Vi reserverar oss för eventuella fel, skrivfel, beräkningsavvikelser samt tekniska begränsningar/buggar i verktyget. " +
    "Beräkningarna utgår från plan mark utan lutning. Vid lutningar/terrängsteg ökar den effektiva sträckan och materialåtgången; ytterligare stolpar, stag, tråd och betong kan krävas. " +
    "Slutlig orderbekräftelse och gällande villkor framgår i kassan på nilsahlgren.se.";

  function addDisclaimer(doc, text, x, y, maxWidth) {
    const FILL = [248, 250, 252], STROKE = [229, 231, 235], TXT = [107, 114, 128];
    doc.setFontSize(9);
    const wrapped = doc.splitTextToSize(text, maxWidth);
    const lineH = 12, pad = 8, boxH = pad * 2 + wrapped.length * lineH;
    doc.setFillColor(...FILL);
    doc.setDrawColor(...STROKE);
    doc.roundedRect(x - 6, y - 10, maxWidth + 12, boxH + 14, 6, 6, "FD");
    doc.setTextColor(...TXT);
    doc.text(wrapped, x, y + pad + 2);
  }

  const discX = P.left;
  const discMaxW = W - P.left - P.right;
  const discY = H - FOOTER_HEIGHT - 120;
  const INSTALL_HDR =
    "Önskar du montage? Vi har ett brett nätverk med kunniga montörer vi kan rekommendera i samband med er order. " +
    "Kontakta info@nilsahlgren.se för att få din offert på montage!";
  doc.setTextColor(...TEXT);
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text(INSTALL_HDR, discX, discY - 20, { maxWidth: discMaxW });
  doc.setFont(undefined, "normal");
  addDisclaimer(doc, DISCLAIMER_TEXT, discX, discY + 20, discMaxW);

  // === Sida 2: Karta & ritning ===
  try {
    const mapPng = staticUrl ? await fetchImageDataUrl(staticUrl) : null;
    doc.addPage();
    doc.setTextColor(...TEXT);
    doc.setFontSize(16);
    doc.text("Karta & ritning", P.left, 40);

    if (mapPng) {
      const availW = W - P.left - P.right;
      const availH = H - 120 - 60;
      const tmp = new Image();
      tmp.src = mapPng;
      await new Promise((r) => (tmp.onload = r, tmp.onerror = r));
      const imgW = tmp.width, imgH = tmp.height;
      const scale = Math.min(availW / imgW, availH / imgH);
      const drawW = imgW * scale, drawH = imgH * scale;
      doc.addImage(mapPng, "PNG", P.left, 56, drawW, drawH, undefined, "FAST");
    } else {
      doc.setTextColor(...MUTED);
      doc.setFontSize(12);
      doc.text("Karta kunde inte bäddas in (CORS/API).", P.left, 64);
    }
  } catch (_) {
    // fortsätt ändå
  }

  // Platsrad nedtill
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 120);
  doc.text(`Plats: ${address || "–"}`, P.left, H - 60);

  // --- Spara PDF
  const today = new Date();
  const dateLabel = today.toLocaleDateString("sv-SE");
  doc.save(`Stängsel-offert ${dateLabel}.pdf`);


  // --- Logga snapshot EFTER att vi vet staticUrl ---
  try {
    await saveProjectSnapshot({
      action: "generate_pdf",
      runs,
      gates,
      height, color, mesh,
      includeConcrete, includeBarbwire, includeGate,
      results,
      lineItems,
      address,
      mapImageUrl: staticUrl || null, // <-- samma vi använde i PDF
      shareUrl, // 👈 NYTT

    });
  } catch (_) {
    // tysta fel – påverka inte användaren
  }
}, [
  lineItems,
  height,
  color,
  mesh,
  results,
  getUnitPrice,
  runs,
  gates,
  includeConcrete,
  includeBarbwire,
  includeGate,
  address,
]);

const exportOrderXml = useCallback(() => {
  if (!lineItems.length) {
    alert("Inga artiklar att exportera.");
    return;
  }

  const merged = mergeRowsBySku(lineItems).filter((row) => {
    const qty = Number(row?.qty || 0);
    return Number.isFinite(qty) && qty > 0;
  });

  if (!merged.length) {
    alert("Inga giltiga artiklar att exportera.");
    return;
  }

  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const orderDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const orderNumber = `OFFERT-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

  const escapeXml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const formatNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  };

  const rowsXml = merged
    .map((row, idx) => {
      const partNumber = escapeXml(row?.sku || "");
      const supplierPartNumber = escapeXml(row?.supplier || "");
      const text = escapeXml(row?.name || row?.sku || `Rad ${idx + 1}`);
      const quantity = formatNumber(row?.qty);
      const each = formatNumber(getUnitPrice(row?.sku, row?.price_sek));

      const rowNumber = (idx + 1) * 10;

      return [
        `    <Row RowNumber="${rowNumber}" RowType="1">`,
        `      <Part PartNumber="${partNumber}" SupplierPartNumber="${supplierPartNumber}" />`,
        `      <Text>${text}</Text>`,
        `      <ReferenceNumber />`,
        `      <Quantity>${quantity}</Quantity>`,
        "      <Unit>st</Unit>",
        `      <DeliveryPeriod>${orderDate}</DeliveryPeriod>`,
        `      <Each>${each}</Each>`,
        "      <Discount>0.00</Discount>",
        "      <Setup />",
        "      <Alloy>0.00</Alloy>",
        "    </Row>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<ORDERS420 SoftwareManufacturer="Monitor ERP System AB" SoftwareName="MONITOR" SoftwareVersion="25.6.9.62905">',
    `  <Order OrderNumber="${escapeXml(orderNumber)}">`,
    "    <Head>",
    '      <Supplier SupplierCodeEdi="22307">',
    "        <Name>Demex Områdesskydd</Name>",
    "        <StreetBox1 />",
    "        <StreetBox2>Box 50</StreetBox2>",
    "        <ZipCity1>33333 Smålandsstenar</ZipCity1>",
    "        <ZipCity2 />",
    "        <Country>Sverige</Country>",
    "      </Supplier>",
    '      <Buyer BuyerCodeEdi="107">',
    "        <Name>Nils Ahlgren AB</Name>",
    "        <StreetBox1>Rörvägen 16</StreetBox1>",
    "        <StreetBox2 />",
    "        <ZipCity1>13650 Jordbro</ZipCity1>",
    "        <ZipCity2 />",
    "        <Country>Sverige</Country>",
    "      </Buyer>",
    "      <References>",
    "        <BuyerReference />",
    "        <BuyerComment />",
    "        <GoodsLabeling>",
    "          <Row1 />",
    "          <Row2 />",
    "        </GoodsLabeling>",
    "      </References>",
    "      <DeliveryAddress>",
    `        <Name>${escapeXml(address || "Leveransadress saknas")}</Name>`,
    "        <StreetBox1 />",
    "        <StreetBox2 />",
    "        <ZipCity1 />",
    "        <ZipCity2 />",
    "        <Country>Sverige</Country>",
    "        <CompanyAdressFlag>0</CompanyAdressFlag>",
    "      </DeliveryAddress>",
    "      <Terms>",
    "        <DeliveryTerms>",
    "          <IncoTermCombiTerm />",
    "          <DeliveryMethod />",
    "          <TransportPayer>P</TransportPayer>",
    "          <CustomerTransportTimeDays />",
    "        </DeliveryTerms>",
    "        <CustomerInvoiceCode>107</CustomerInvoiceCode>",
    `        <OrderDate>${orderDate}</OrderDate>`,
    "        <PaymentTerms>",
    "          <TermsOfPaymentDays>30</TermsOfPaymentDays>",
    "        </PaymentTerms>",
    "      </Terms>",
    "      <Export>",
    "        <Currency>SEK</Currency>",
    "      </Export>",
    "    </Head>",
    "    <Rows>",
    rowsXml,
    "    </Rows>",
    "  </Order>",
    "</ORDERS420>",
    "",
  ].join("\n");

  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${orderNumber}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}, [lineItems, getUnitPrice, address]);



  /* ===== Ikoner (map markers) ===== */
  const vertexIcon = useMemo(() => {
    if (!isLoaded || !window.google) return undefined;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 5.5,
      fillColor: ACCENT_RED,
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    };
  }, [isLoaded]);

  const midIcon = useMemo(() => {
    if (!isLoaded || !window.google) return undefined;
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 4,
      fillColor: ACCENT_RED,
      fillOpacity: 0.7,
      strokeColor: "#ffffff",
      strokeOpacity: 0.7,
      strokeWeight: 1.5,
    };
  }, [isLoaded]);

  const gateIcon = useMemo(() => {
    if (!isLoaded || !window.google) return undefined;
    return {
      path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
      scale: 5,
      fillColor: "#fffb00ff",
      fillOpacity: 1,
      strokeColor: "#000000ff",
      strokeWeight: 1.5,
    };
  }, [isLoaded]);

  // Grind-överlägg (svart segment över själva grindens bredd)
  useEffect(() => {
    if (!isLoaded || !window.google || !mapRef.current) return;

    Object.keys(gatePolylinesRef.current).forEach((id) => {
      if (!gates.find((g) => g.id === id && includeGate && Number.isFinite(g.lat) && Number.isFinite(g.lng))) {
        gatePolylinesRef.current[id].setMap(null);
        delete gatePolylinesRef.current[id];
      }
    });

    gates.forEach((g) => {
      if (!includeGate) return;
      if (!Number.isFinite(g.lat) || !Number.isFinite(g.lng)) return;
      const run = runs.find((r) => r.id === (g.runId || activeId));
      if (!run || run.vertices.length < 2) return;

      const segIdx = Number.isFinite(g.segIdx)
        ? g.segIdx
        : (() => {
            const idx = nearestSegmentIndex(run, g.lng, g.lat);
            updateGate(g.id, { segIdx: idx });
            return idx;
          })();
      const seg = getSegment(run, segIdx);
      if (!seg) return;

const L = metersBetween(seg.A, seg.B);
const gateLen = gateLengthMeters(g);
const half = gateLen / 2;

// Segmentet måste vara längre än grinden
if (!Number.isFinite(L) || !Number.isFinite(gateLen) || gateLen >= L) return;

const dAcenter = metersBetween(seg.A, { lat: g.lat, lng: g.lng });

// Hjälpare
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

const Lkm = L / 1000;
const centerKm = dAcenter / 1000;
const halfKm = half / 1000;

// Kläm start/slut inom [0, L]
let s = clamp(centerKm - halfKm, 0, Lkm);
let e = clamp(centerKm + halfKm, 0, Lkm);

// Om intervallet blir för litet (t.ex. när man drar över ett hörn), rita inget
if (!Number.isFinite(s) || !Number.isFinite(e) || e - s < 1e-6) {
  if (gatePolylinesRef.current[g.id]) {
    gatePolylinesRef.current[g.id].setMap(null);
    delete gatePolylinesRef.current[g.id];
  }
  return;
}

const segLine = turf.lineString([
  [seg.A.lng, seg.A.lat],
  [seg.B.lng, seg.B.lat],
]);

let p1, p2;
try {
  p1 = turf.along(segLine, s, { units: "kilometers" });
  p2 = turf.along(segLine, e, { units: "kilometers" });
} catch (err) {
  console.error("Gate overlay turf.along failed", { s, e, seg }, err);
  return;
}

const path = [
  new window.google.maps.LatLng(p1.geometry.coordinates[1], p1.geometry.coordinates[0]),
  new window.google.maps.LatLng(p2.geometry.coordinates[1], p2.geometry.coordinates[0]),
];


      if (!gatePolylinesRef.current[g.id]) {
        gatePolylinesRef.current[g.id] = new window.google.maps.Polyline({
          strokeColor: "#fffb00ff",
          strokeOpacity: 1,
          strokeWeight: 6,
          clickable: false,
          map: mapRef.current,
          zIndex: 1000,  
        });
      }
      gatePolylinesRef.current[g.id].setPath(path);
    });
  }, [isLoaded, mapRef, gates, includeGate, runs, activeId, updateGate]);

  // Mid-handles (infoga punkt mellan två)
  const midHandles = useMemo(() => {
    const n = vertices.length;
    const arr = [];
    if (n < 2) return arr;

    for (let i = 0; i < n - 1; i++) {
      const m = turf.midpoint(toPoint(vertices[i]), toPoint(vertices[i + 1]));
      const [lng, lat] = m.geometry.coordinates;
      arr.push({ lat, lng, i, j: i + 1 });
    }

    if (closed && n >= 3) {
      const m = turf.midpoint(toPoint(vertices[n - 1]), toPoint(vertices[0]));
      const [lng, lat] = m.geometry.coordinates;
      arr.push({ lat, lng, i: n - 1, j: 0 });
    }
    return arr;
  }, [vertices, closed]);

  return (
    <div className="measure-shell" style={{ display: "flex" }}>
      {/* KARTA */}
      <div className={`measure-map not-sticky ${mapExpanded ? "map-expanded" : "map-collapsed"}`}>
  <button
    type="button"
    className="map-toggle"
    aria-expanded={mapExpanded}
    onClick={() => setMapExpanded((v) => !v)}
    title={mapExpanded ? "Minimera karta" : "Expandera karta"}
  >
    {mapExpanded ? "Minimera" : "Expandera"}
  </button>

  {!isLoaded ? (
    <div style={{ padding: 16 }}>Laddar Google Maps…</div>
  ) : loadError ? (
    <div style={{ padding: 16, color: "#b91c1c" }}>
      Kunde inte ladda Google Maps (kolla API-nyckel och behörigheter).
    </div>
  ) : (
    // === WRAPPER för overlay och full höjd ===
    <div className="map-wrap">
      <GoogleMap
        onLoad={(map) => (mapRef.current = map)}
        onUnmount={() => {
          if (mainPolylineRef.current) {
            mainPolylineRef.current.setMap(null);
            mainPolylineRef.current = null;
          }
          mapRef.current = null;
        }}
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={DEFAULT_CENTER}
        zoom={17}
        onClick={onMapClick}
        options={mapOptions}
      >
        {/* Vertices */}
        {vertices.map((p, i) => {
          const isStart = i === 0;
          const canClose = !closed && vertices.length >= 3;
          return (
            <Marker
              key={isStart ? "v-start" : `v-${i}`}
              position={{ lat: p.lat, lng: p.lng }}
              icon={vertexIcon || undefined}
              draggable={true}
              onDragStart={() => { pushHistory(); }}
              onDrag={(e) => {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                const temp = vertices.slice();
                temp[i] = { lat, lng };
                schedulePreview(temp, closed);
              }}
              onDragEnd={(e) => {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                setVertices((prev) => {
                  const next = prev.slice();
                  next[i] = { lat, lng };
                  return next;
                });
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
              }}
              clickable={isStart && canClose}
              title={isStart && canClose ? "Klicka för att stänga slingan" : ""}
              options={{ cursor: isStart && canClose ? "pointer" : "default" }}
              onClick={isStart ? closeLoop : undefined}
              onRightClick={() => {
                pushHistory();
                setVertices((prev) => prev.filter((_, idx) => idx !== i));
              }}
            />
          );
        })}

        {/* Mitt-handtag (infoga ny punkt) */}
        {midHandles.map((h, idx) => (
          <Marker
            key={`mid-${h.i}-${h.j}-${idx}`}
            position={{ lat: h.lat, lng: h.lng }}
            icon={midIcon}
            draggable={true}
            onDragStart={() => { pushHistory(); }}
            onDrag={(e) => {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              const temp = vertices.slice();
              const insertAt = h.i === vertices.length - 1 && h.j === 0 ? vertices.length : h.j;
              temp.splice(insertAt, 0, { lat, lng });
              schedulePreview(temp, closed);
            }}
            onDragEnd={(e) => {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              setVertices((prev) => {
                const next = prev.slice();
                const insertAt = h.i === prev.length - 1 && h.j === 0 ? prev.length : h.j;
                next.splice(insertAt, 0, { lat, lng });
                return next;
              });
              if (rafRef.current) cancelAnimationFrame(rafRef.current);
            }}
          />
        ))}

        {/* Grind-placeringar */}
        {includeGate &&
          gates.map((g) => {
            if (!Number.isFinite(g.lat) || !Number.isFinite(g.lng)) return null;
            const run = runs.find((r) => r.id === g.runId);
            return (
              <Marker
                key={`gate-${g.id}`}
                position={{ lat: g.lat, lng: g.lng }}
                icon={gateIcon}
                draggable={true}
                title={"Grind"}
                onDragEnd={(e) => {
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  const runForSnap = run || runs.find((r) => r.id === activeId);
                  if (!runForSnap || runForSnap.vertices.length < 2) {
                    updateGate(g.id, { lat, lng, runId: activeId });
                    return;
                  }
                  const snapped = snapGateToSegment(runForSnap, g, lng, lat);
                  if (!snapped) {
                    alert("Segmentet är kortare än grindens bredd – flytta grinden till en längre rak del.");
                    return;
                  }
                  updateGate(g.id, { lat: snapped.lat, lng: snapped.lng, runId: runForSnap.id, segIdx: snapped.segIdx });
                }}
              />
            );
          })}
      </GoogleMap>
    </div>
  )}
</div>


      {/* PANEL */}
      <aside className="measure-panel" style={{ width: 450 }}>
        <div className="panel-body">
          {/* Adressök */}
          <div className="card card-pad">
            <div className="card-title">Sök adress</div>
            <div className="row">
              {isLoaded ? (
                <Autocomplete onLoad={(ac) => (autoRef.current = ac)} onPlaceChanged={onPlaceChanged}>
                  <input
                    className="input"
                    type="text"
                    placeholder="Skriv en adress…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && search()}
                  />
                </Autocomplete>
              ) : (
                <input className="input" disabled placeholder="Laddar…" />
              )}
              <button className="btn btn-primary" onClick={search}>Sök</button>
            </div>
          </div>
          {/* Flytande “?”-knapp */}



          {/* Specifikation */}
          <div className="card card-pad">
            <div className="card-title">Specifikation</div>
            <div className="row">
              <label style={{ minWidth: 110, color: "#6b7280" }}>Höjd</label>
              <select className="select" value={height} onChange={(e) => setHeight(e.target.value)}>
                <option value="2000">2000 mm</option>
                <option value="3000">3000 mm</option>
              </select>
            </div>
            <div className="row">
              <label style={{ minWidth: 110, color: "#6b7280" }}>Färg</label>
              <select className="select" value={color} onChange={(e) => setColor(e.target.value)}>
                <option>Mörkgrön</option>
                <option>Olivgrön</option>
                <option>Svart</option>
                <option>Varmförzinkat</option>
              </select>
            </div>
            <div className="row">
              <label
                style={{ minWidth: 110, color: "#6b7280", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                Maska
                <HelpTip
                  text="Maska = storleken på hålen i nätet (mm). För industristängsel är den satt till 50 mm."
                />
              </label>

              <div
                style={{
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 8,
                  background: "#f9fafb",
                  color: "#111827",
                }}
              >
                50 mm
              </div>
            </div>

          </div>

          {/* Sträckor */}
          <div className="card card-pad">
            <div className="card-title">Sträckor</div>

            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-secondary" onClick={addStretch}>+ Ny sträcka</button>
              <button className="btn btn-ghost" onClick={undo} disabled={undoCount === 0}>Ångra</button>
              <button className="btn btn-ghost" onClick={reset}>Rensa alla</button>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {[...runs] // gör en kopia innan sort
                .sort((a, b) => (a.seq || 0) - (b.seq || 0))
                .map((r, idx) => {
                  const rRes = computeAll(r.vertices, r.closed);
                  const isActive = r.id === activeId;
                  return (
                    <div
                      key={r.id}
                      className="row"
                      style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}
                    >
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        <strong>Sträcka {r.seq ?? (idx + 1)}</strong>
                        {" · "}
                        {rRes.lengthMeters.toFixed(2)} m
                        {r.closed ? " · Sluten" : ""}
                        {isActive && <span style={{ marginLeft: 8, color: "#128f25ff", fontWeight: 650 }}>(Aktiv)</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {!isActive && (
                          <button className="btn btn-ghost" onClick={() => activateRun(r.id)}>Redigera</button>
                        )}
                        <button className="btn btn-del" onClick={() => removeRun(r.id)}>Ta bort</button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Tillbehör */}
          <div className="card card-pad">
            <div className="card-title">Tillbehör</div>

            <div className="row" style={{ alignItems: "center", gap: 12 }}>
              <input
                id="acc-concrete"
                type="checkbox"
                checked={includeConcrete}
                onChange={(e) => setIncludeConcrete(e.target.checked)}
              />
              <label htmlFor="acc-concrete">Plintbetong (3/stolpe)</label>
            </div>

            <div className="row" style={{ alignItems: "center", gap: 12, marginTop: 8 }}>
              <input
                id="acc-barbwire"
                type="checkbox"
                checked={includeBarbwire}
                onChange={(e) => setIncludeBarbwire(e.target.checked)}
              />
              <label htmlFor="acc-barbwire">Taggtråd (3 rader)</label>
            </div>

            <div className="row" style={{ alignItems: "center", gap: 12, marginTop: 8 }}>
              <input
                id="acc-gate"
                type="checkbox"
                checked={includeGate}
                onChange={(e) => onToggleIncludeGate(e.target.checked)}
              />
              <label htmlFor="acc-gate">Lägg till grind</label>
            </div>

            {includeGate && (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {gates.map((g, idx) => (
                  <React.Fragment key={g.id}>
                    {gates.length > 1 && idx > 0 && (
                      <div style={{ height: 1, background: "#e5e7eb", opacity: 0.6, width: "100%" }} />
                    )}

                    <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <label style={{ minWidth: 60, color: "#6b7280" }}>Typ</label>
                      <select
                        className="select"
                        value={g.type}
                        onChange={(e) => {
                          const nextType = e.target.value;
                          updateGate(g.id, {
                            type: nextType,
                            width: nextType === "single" ? "1000" : "1000+1000",
                          });
                        }}
                      >
                        <option value="single">Enkel</option>
                        <option value="double">Dubbel</option>
                      </select>

                      <label style={{ minWidth: 60, color: "#6b7280" }}>Bredd</label>
                      {g.type === "single" ? (
                        <select
                          className="select"
                          value={g.width}
                          onChange={(e) => updateGate(g.id, { width: e.target.value })}
                        >
                          <option value="1000">1000 mm</option>
                          <option value="2000">2000 mm</option>
                        </select>
                      ) : (
                        <select
                          className="select"
                          value={g.width}
                          onChange={(e) => updateGate(g.id, { width: e.target.value })}
                        >
                          <option value="1000+1000">1000 mm + 1000 mm</option>
                          <option value="1000+2000">1000 mm + 2000 mm</option>
                          <option value="2000+2000">2000 mm + 2000 mm</option>
                        </select>
                      )}
                    {/* Tillbehör */}
                      <button
                        className="btn btn-ghost"
                        onClick={() => setPlacingGateId(g.id)}
                        title={Number.isFinite(g.lat) ? "Flytta" : "Placera"}
                        style={{ marginLeft: 4 }}
                      >
                        {Number.isFinite(g.lat) ? "Flytta" : "Placera"}
                      </button>
                      {placingGateId === g.id && (
                        <span style={{ fontSize: 12, color: "#6b7280" }}>Klicka på sträckan i kartan…</span>
                      )}

                      <button
                        className="btn btn-del"
                        onClick={() => removeGate(g.id)}
                        title="Ta bort"
                      >
                        Ta bort
                      </button>
                    </div>
                  </React.Fragment>
                ))}

                <div>
                  <button className="btn btn-secondary" onClick={addGate}>+ Lägg till grind</button>
                </div>
              </div>
            )}
          </div>

          {/* Beräkning */}
          <div className="card card-pad">
            <div
              className="card-title"
              role="button"
              tabIndex={0}
              aria-expanded={calcOpen}
              onClick={() => setCalcOpen(o => o ? false : true)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setCalcOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: 8 }}
            >
              <span>Beräkning</span>
              <Chevron open={calcOpen} />
            </div>

            {calcOpen && (
              <div className="stat-grid">
                <div className="stat">
                  <div className="kpi">{results.lengthMeters.toFixed(2)} m</div>
                  <div className="lbl">Total längd</div>
                </div>

                {results.endPosts > 0 && (
                  <div className="stat">
                    <div className="kpi">{results.endPosts}</div>
                    <div className="lbl">Ändstolpar</div>
                  </div>
                )}

                {results.cornerPosts > 0 && (
                  <div className="stat">
                    <div className="kpi">{results.cornerPosts}</div>
                    <div className="lbl">Hörnstolpar (&gt;45°)</div>
                  </div>
                )}

                {results.intermediatePosts > 0 && (
                  <div className="stat">
                    <div className="kpi">{results.intermediatePosts}</div>
                    <div className="lbl">Mellanstolpar</div>
                  </div>
                )}

                {results.stays > 0 && (
                  <div className="stat">
                    <div className="kpi">{results.stays}</div>
                    <div className="lbl">Stag 3,5 m</div>
                  </div>
                )}

                {results.rolls > 0 && (
                  <div className="stat">
                    <div className="kpi">{results.rolls}</div>
                    <div className="lbl">Rullar stängsel (à 25 m)</div>
                  </div>
                )}

                {results.stayWireRolls > 0 && (
                  <div className="stat">
                    <div className="kpi">{results.stayWireRolls}</div>
                    <div className="lbl">Stagtråd (rullar à 50 m)</div>
                  </div>
                )}

                {results.barbwireRolls > 0 && (
                  <div className="stat">
                    <div className="kpi">{results.barbwireRolls}</div>
                    <div className="lbl">Taggtråd (rullar à 250 m)</div>
                  </div>
                )}

                {includeConcrete && concreteQty > 0 && (
                  <div className="stat">
                    <div className="kpi">{concreteQty}</div>
                    <div className="lbl">Plintbetong (säckar)</div>
                  </div>
                )}

                {includeGate && gates.length > 0 && (
                  <div className="stat" style={{ gridColumn: "1 / -1" }}>
                    <div className="kpi">{gates.length}</div>
                    <div className="lbl">Grindar</div>
                    <div style={{ color: "#6b7280", fontSize: 12, marginTop: 6, display: "grid", gap: 4 }}>
                      {gates.map((g) => (
                        <div key={`g-${g.id}`}>• {gatePrettyLabel(g, { color, height })}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

{/* Generera PDF + Gå till kassan */}
<div className="row row-actions" style={{ gap: 8 }}>
 <button
  className="btn btn-primary btn-inline-logo"
  onClick={goToCheckout}
  disabled={creatingCart || !(lineItems && lineItems.length)}
  title="Skapar varukorg och går till kassan"
>
  <span className="btn-inline-logo__label">
    {creatingCart ? "Skapar varukorg…" : "Skapa varukorg"}
  </span>
  <img
    src="/logos/klarna.png"
    alt="Klarna"
    className="btn-inline-logo__img"
  />
</button>
</div>

<div className="row row-actions" style={{ gap: 8 }}>
  <button
    className="btn btn-white-sm"
    onClick={generatePdf}
    disabled={!skus.length}
    title="Generera offert som PDF"
  >
    Generera offert
  </button>
</div>

<div className="row row-actions" style={{ gap: 8 }}>
  <button
    className="btn btn-white-sm"
    onClick={exportOrderXml}
    disabled={!hasPositiveLineItems}
    title="Exportera material som Monitor-orderfil"
  >
    Exportera orderfil
  </button>
</div>

<div className="panel-footer-overlay" role="note" aria-label="Copyright notice">
  <span>© 2025 Nils Ahlgren AB</span>
</div>



        </div>
      </aside>
       {/* Flytande “?”-knapp */}
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        aria-label="Visa hjälp"
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          width: 44,
          height: 44,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#0F3D91",
          color: "white",
          fontWeight: 700,
          boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
          cursor: "pointer",
          zIndex: 999,
        }}
      >
        ?
      </button>

      {/* Hjälp-modal */}
      <ToolHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      
    </div>
  );
}
