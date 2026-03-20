"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tag, Download, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const L_PATTERNS: Record<string, string> = {
  "0": "0001101", "1": "0011001", "2": "0010011", "3": "0111101",
  "4": "0100011", "5": "0110001", "6": "0101111", "7": "0111011",
  "8": "0110111", "9": "0001011",
};

const G_PATTERNS: Record<string, string> = {
  "0": "0100111", "1": "0110011", "2": "0011011", "3": "0100001",
  "4": "0011101", "5": "0111001", "6": "0000101", "7": "0010001",
  "8": "0001001", "9": "0010111",
};

const R_PATTERNS: Record<string, string> = {
  "0": "1110010", "1": "1100110", "2": "1101100", "3": "1000010",
  "4": "1011100", "5": "1001110", "6": "1010000", "7": "1000100",
  "8": "1001000", "9": "1110100",
};

const PARITY_TABLE: Record<string, Array<"L" | "G">> = {
  "0": ["L","L","L","L","L","L"], "1": ["L","L","G","L","G","G"],
  "2": ["L","L","G","G","L","G"], "3": ["L","L","G","G","G","L"],
  "4": ["L","G","L","L","G","G"], "5": ["L","G","G","L","L","G"],
  "6": ["L","G","G","G","L","L"], "7": ["L","G","L","G","L","G"],
  "8": ["L","G","L","G","G","L"], "9": ["L","G","G","L","G","L"],
};

const MODULE_WIDTH = 4;
const GUARD_HEIGHT_FACTOR = 1.1;
const HEIGHT = 120;
const QUIET_ZONE_MODULES = 9;
const DIGIT_FONT_SIZE = 30;
const DIGIT_FONT_WEIGHT = 700;
const DIGIT_MARGIN_TOP = 5;
const DIGIT_BOTTOM_PADDING = 0;
const DIGIT_FONT_PRIMARY = "Arial";
const DIGIT_FONT_FAMILY = `${DIGIT_FONT_PRIMARY}, "Helvetica Neue", Arial, sans-serif`;
const FIRST_DIGIT_EXTRA_LEFT = MODULE_WIDTH * 4;

function calculateCheckDigit(digits: string) {
  const sum = digits.split("").map((d) => Number.parseInt(d, 10))
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const mod = sum % 10;
  return mod === 0 ? "0" : String(10 - mod);
}

function encodeEan13(input: string) {
  if (!/^\d{12,13}$/.test(input)) throw new Error("EAN-13 måste bestå av 12 eller 13 siffror.");
  const base = input.slice(0, 12);
  const checkDigit = input.length === 12 ? calculateCheckDigit(base) : input.slice(12);
  if (calculateCheckDigit(base) !== checkDigit) throw new Error("Kontrollsiffran stämmer inte överens med resten av koden.");
  const digits = base + checkDigit;
  const firstDigit = digits[0];
  const parity = PARITY_TABLE[firstDigit];
  const leftSide = digits.slice(1, 7).split("").map((d, i) => {
    const v = parity[i];
    return v === "L" ? L_PATTERNS[d] : G_PATTERNS[d];
  }).join("");
  const rightSide = digits.slice(7).split("").map((d) => R_PATTERNS[d]).join("");
  const pattern = `101${leftSide}01010${rightSide}101`;
  return { digits, pattern };
}

function trimCanvasWhitespace(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const isWhite = (i: number) => {
    const a = data[i + 3];
    return a === 0 || (data[i] > 250 && data[i+1] > 250 && data[i+2] > 250);
  };
  let top = 0, bottom = height - 1, left = 0, right = width - 1;
  while (top < height) { let ok = false; for (let x = 0; x < width; x++) if (!isWhite((top*width+x)*4)) { ok=true; break; } if (ok) break; top++; }
  while (bottom > top) { let ok = false; for (let x = 0; x < width; x++) if (!isWhite((bottom*width+x)*4)) { ok=true; break; } if (ok) break; bottom--; }
  while (left < width) { let ok = false; for (let y = top; y <= bottom; y++) if (!isWhite((y*width+left)*4)) { ok=true; break; } if (ok) break; left++; }
  while (right > left) { let ok = false; for (let y = top; y <= bottom; y++) if (!isWhite((y*width+right)*4)) { ok=true; break; } if (ok) break; right--; }
  const tw = right - left + 1, th = bottom - top + 1;
  if (tw <= 0 || th <= 0) return;
  const tmp = document.createElement("canvas");
  tmp.width = tw; tmp.height = th;
  tmp.getContext("2d")?.drawImage(canvas, left, top, tw, th, 0, 0, tw, th);
  canvas.width = tw; canvas.height = th;
  canvas.getContext("2d")?.drawImage(tmp, 0, 0);
}

function drawBarcode(canvas: HTMLCanvasElement, digits: string, pattern: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const totalModules = pattern.length + QUIET_ZONE_MODULES * 2;
  canvas.width = totalModules * MODULE_WIDTH;
  canvas.height = HEIGHT + DIGIT_MARGIN_TOP + DIGIT_FONT_SIZE + DIGIT_BOTTOM_PADDING;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  const guardModuleIndices = new Set<number>();
  [[0,3],[3+42,3+42+5],[3+42+5+42,3+42+5+42+3]].forEach(([s,e]) => {
    for (let i = s; i < e; i++) guardModuleIndices.add(i + QUIET_ZONE_MODULES);
  });
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "1") {
      const x = (i + QUIET_ZONE_MODULES) * MODULE_WIDTH;
      const isGuard = guardModuleIndices.has(i + QUIET_ZONE_MODULES);
      ctx.fillRect(x, 0, MODULE_WIDTH, isGuard ? HEIGHT * GUARD_HEIGHT_FACTOR : HEIGHT);
    }
  }
  ctx.font = `${DIGIT_FONT_WEIGHT} ${DIGIT_FONT_SIZE}px ${DIGIT_FONT_FAMILY}`;
  ctx.textBaseline = "top";
  const textY = HEIGHT + DIGIT_MARGIN_TOP;
  ctx.fillText(digits[0] ?? "", QUIET_ZONE_MODULES * MODULE_WIDTH - 10 - FIRST_DIGIT_EXTRA_LEFT, textY);
  const leftStart = (QUIET_ZONE_MODULES + 3) * MODULE_WIDTH;
  const rightStart = (QUIET_ZONE_MODULES + 3 + 42 + 5) * MODULE_WIDTH;
  const spacing = MODULE_WIDTH * 7;
  digits.slice(1, 7).split("").forEach((d, i) => ctx.fillText(d, leftStart + i * spacing + 6, textY));
  digits.slice(7).split("").forEach((d, i) => ctx.fillText(d, rightStart + i * spacing + 6, textY));
  trimCanvasWhitespace(canvas);
}

export default function EanPage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [encoded, setEncoded] = useState<{ digits: string; pattern: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleGenerate = useCallback(() => {
    try {
      const result = encodeEan13(input.trim());
      setEncoded(result);
      setError(null);
    } catch (err) {
      setEncoded(null);
      setError(err instanceof Error ? err.message : "Något gick fel.");
    }
  }, [input]);

  useEffect(() => {
    if (!encoded || !canvasRef.current) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    const render = async () => {
      if (typeof document !== "undefined" && "fonts" in document) {
        try {
          await document.fonts.load(`${DIGIT_FONT_WEIGHT} ${DIGIT_FONT_SIZE}px ${DIGIT_FONT_PRIMARY}`);
          await document.fonts.ready;
        } catch {}
      }
      if (!cancelled && canvas) drawBarcode(canvas, encoded.digits, encoded.pattern);
    };
    void render();
    return () => { cancelled = true; };
  }, [encoded]);

  const handleDownload = useCallback(() => {
    if (!canvasRef.current || !encoded) return;
    const link = document.createElement("a");
    link.href = canvasRef.current.toDataURL("image/png");
    link.download = `ean-${encoded.digits}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [encoded]);

  const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleGenerate();
  }, [handleGenerate]);

  const helperText = useMemo(() => {
    if (!encoded) return "Ange 12 eller 13 siffror — kontrollsiffran räknas ut automatiskt.";
    return `Kontrollsiffra: ${encoded.digits.slice(-1)} · Fullständig kod: ${encoded.digits}`;
  }, [encoded]);

  return (
    <div className="mx-auto max-w-6xl space-y-10">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-violet-400 uppercase">
          Verktyg
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-100" style={{ letterSpacing: "-0.02em" }}>
          EAN-generator
        </h1>
        <p className="mt-2 text-sm text-gray-300">
          Generera EAN-13-streckkoder och ladda ned dem som PNG.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Vänster: formulär ──────────────────────────────── */}
        <div className="space-y-6">

          {/* Input-sektion */}
          <div className="rounded-2xl border border-white/[0.30] bg-white/[0.16] p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                <Tag className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-100">Generera streckkod</h2>
                <p className="text-xs text-gray-400">Klistra in eller skriv in en EAN-13-kod</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="ean-input" className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
                  EAN-13-kod
                </label>
                <input
                  id="ean-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value.replace(/\s+/g, ""))}
                  placeholder="Exempel: 731869011290"
                  inputMode="numeric"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={13}
                  className="w-full rounded-xl border border-white/[0.32] bg-white/[0.16] py-3 px-4 font-mono text-sm tracking-widest text-gray-200 placeholder-gray-600 outline-none transition-all focus:border-amber-500/50 focus:bg-white/[0.12] focus:ring-1 focus:ring-amber-500/30"
                />
                <p className={`text-xs ${encoded ? "text-emerald-400" : "text-gray-500"}`}>
                  {helperText}
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-400"
                >
                  Generera
                </button>
                <button
                  type="button"
                  disabled={!encoded}
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/[0.30] bg-white/[0.16] px-4 py-2.5 text-sm font-semibold text-gray-300 transition-all duration-200 hover:border-white/[0.25] hover:bg-white/[0.13] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  PNG
                </button>
              </div>
            </form>
          </div>

          {/* Info-kort */}
          <div className="rounded-2xl border border-white/[0.09] bg-white/[0.08] p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">Om EAN-13</p>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/60" />
                Ange 12 siffror — kontrollsiffra räknas ut automatiskt
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/60" />
                Ange 13 siffror — kontrollsiffran verifieras
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/60" />
                PNG-filen laddas ned med vit bakgrund, redo att trycka
              </li>
            </ul>
          </div>
        </div>

        {/* ── Höger: förhandsgranskning ──────────────────────── */}
        <div className="rounded-2xl border border-white/[0.30] bg-white/[0.16] p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-100">Förhandsgranskning</h2>
            <p className="mt-0.5 text-xs text-gray-400">Streckkoden visas här i realtid</p>
          </div>

          {encoded ? (
            <div className="flex flex-col items-center gap-5">
              {/* Canvas på vit bakgrund */}
              <div className="w-full overflow-hidden rounded-xl bg-white p-6">
                <canvas
                  ref={canvasRef}
                  className="mx-auto block max-w-full"
                  aria-label="Genererad streckkod"
                />
              </div>

              {/* Digits display */}
              <div className="flex w-full items-center justify-between rounded-xl border border-white/[0.30] bg-white/[0.12] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Kod</p>
                <code
                  className="font-mono text-base font-bold tracking-[0.2em] text-gray-100"
                  style={{ fontFamily: DIGIT_FONT_FAMILY }}
                >
                  {encoded.digits}
                </code>
              </div>

              {/* Download-knapp stor */}
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition-all duration-200 hover:bg-emerald-500/15 hover:text-emerald-200"
              >
                <Download className="h-4 w-4" />
                Ladda ner som PNG
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-white/[0.12] py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.12] text-gray-500">
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Ingen streckkod ännu</p>
                <p className="mt-1 text-xs text-gray-600">Ange en EAN-13-kod och tryck Generera</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
