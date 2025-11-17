"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const L_PATTERNS: Record<string, string> = {
  "0": "0001101",
  "1": "0011001",
  "2": "0010011",
  "3": "0111101",
  "4": "0100011",
  "5": "0110001",
  "6": "0101111",
  "7": "0111011",
  "8": "0110111",
  "9": "0001011",
};

const G_PATTERNS: Record<string, string> = {
  "0": "0100111",
  "1": "0110011",
  "2": "0011011",
  "3": "0100001",
  "4": "0011101",
  "5": "0111001",
  "6": "0000101",
  "7": "0010001",
  "8": "0001001",
  "9": "0010111",
};

const R_PATTERNS: Record<string, string> = {
  "0": "1110010",
  "1": "1100110",
  "2": "1101100",
  "3": "1000010",
  "4": "1011100",
  "5": "1001110",
  "6": "1010000",
  "7": "1000100",
  "8": "1001000",
  "9": "1110100",
};

const PARITY_TABLE: Record<string, Array<"L" | "G">> = {
  "0": ["L", "L", "L", "L", "L", "L"],
  "1": ["L", "L", "G", "L", "G", "G"],
  "2": ["L", "L", "G", "G", "L", "G"],
  "3": ["L", "L", "G", "G", "G", "L"],
  "4": ["L", "G", "L", "L", "G", "G"],
  "5": ["L", "G", "G", "L", "L", "G"],
  "6": ["L", "G", "G", "G", "L", "L"],
  "7": ["L", "G", "L", "G", "L", "G"],
  "8": ["L", "G", "L", "G", "G", "L"],
  "9": ["L", "G", "G", "L", "G", "L"],
};

function calculateCheckDigit(digits: string) {
  const sum = digits
    .split("")
    .map((digit) => Number.parseInt(digit, 10))
    .reduce((acc, digit, index) => {
      return acc + digit * (index % 2 === 0 ? 1 : 3);
    }, 0);

  const mod = sum % 10;
  return mod === 0 ? "0" : String(10 - mod);
}

function encodeEan13(input: string) {
  if (!/^\d{12,13}$/.test(input)) {
    throw new Error("EAN-13 måste bestå av 12 eller 13 siffror.");
  }

  const base = input.slice(0, 12);
  const checkDigit = input.length === 12 ? calculateCheckDigit(base) : input.slice(12);

  if (calculateCheckDigit(base) !== checkDigit) {
    throw new Error("Kontrollsiffran stämmer inte överens med resten av koden.");
  }

  const digits = base + checkDigit;
  const firstDigit = digits[0];
  const parity = PARITY_TABLE[firstDigit];

  const leftSide = digits
    .slice(1, 7)
    .split("")
    .map((digit, index) => {
      const variant = parity[index];
      if (variant === "L") {
        return L_PATTERNS[digit];
      }
      return G_PATTERNS[digit];
    })
    .join("");

  const rightSide = digits
    .slice(7)
    .split("")
    .map((digit) => R_PATTERNS[digit])
    .join("");

  const pattern = `101${leftSide}01010${rightSide}101`;
  return { digits, pattern };
}

const MODULE_WIDTH = 4;
const GUARD_HEIGHT_FACTOR = 1.1;
const HEIGHT = 120;
const QUIET_ZONE_MODULES = 9;
const DIGIT_FONT_SIZE = 30;
const DIGIT_FONT_WEIGHT = 700;
const DIGIT_MARGIN_TOP = 5;
const DIGIT_BOTTOM_PADDING = 0;
const DIGIT_FONT_PRIMARY = 'Arial';
const DIGIT_FONT_FAMILY = `${DIGIT_FONT_PRIMARY}, "Helvetica Neue", Arial, sans-serif`;
const FIRST_DIGIT_EXTRA_LEFT = MODULE_WIDTH * 4; // t.ex. 6 moduler = 24 px


function trimCanvasWhitespace(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  const isWhitePixel = (index: number) => {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const a = data[index + 3];
    return a === 0 || (r > 250 && g > 250 && b > 250);
  };

  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;

  while (top < height) {
    let hasContent = false;
    for (let x = 0; x < width; x += 1) {
      if (!isWhitePixel((top * width + x) * 4)) {
        hasContent = true;
        break;
      }
    }
    if (hasContent) break;
    top += 1;
  }

  while (bottom > top) {
    let hasContent = false;
    for (let x = 0; x < width; x += 1) {
      if (!isWhitePixel((bottom * width + x) * 4)) {
        hasContent = true;
        break;
      }
    }
    if (hasContent) break;
    bottom -= 1;
  }

  while (left < width) {
    let hasContent = false;
    for (let y = top; y <= bottom; y += 1) {
      if (!isWhitePixel((y * width + left) * 4)) {
        hasContent = true;
        break;
      }
    }
    if (hasContent) break;
    left += 1;
  }

  while (right > left) {
    let hasContent = false;
    for (let y = top; y <= bottom; y += 1) {
      if (!isWhitePixel((y * width + right) * 4)) {
        hasContent = true;
        break;
      }
    }
    if (hasContent) break;
    right -= 1;
  }

  const trimmedWidth = right - left + 1;
  const trimmedHeight = bottom - top + 1;

  if (trimmedWidth <= 0 || trimmedHeight <= 0) {
    return;
  }

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;
  const trimmedCtx = trimmedCanvas.getContext("2d");
  if (!trimmedCtx) return;
  trimmedCtx.drawImage(canvas, left, top, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);

  canvas.width = trimmedWidth;
  canvas.height = trimmedHeight;
  const finalCtx = canvas.getContext("2d");
  if (!finalCtx) return;
  finalCtx.drawImage(trimmedCanvas, 0, 0);
}

function drawBarcode(canvas: HTMLCanvasElement, digits: string, pattern: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const totalModules = pattern.length + QUIET_ZONE_MODULES * 2;
  const width = totalModules * MODULE_WIDTH;
  const height = HEIGHT;
  canvas.width = width;
  canvas.height = height + DIGIT_MARGIN_TOP + DIGIT_FONT_SIZE + DIGIT_BOTTOM_PADDING;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#000000";
  const guardModuleIndices = new Set<number>();
  const guardRanges: Array<[number, number]> = [
    [0, 3],
    [3 + 42, 3 + 42 + 5],
    [3 + 42 + 5 + 42, 3 + 42 + 5 + 42 + 3],
  ];
  guardRanges.forEach(([start, end]) => {
    for (let i = start; i < end; i += 1) {
      guardModuleIndices.add(i + QUIET_ZONE_MODULES);
    }
  });

  for (let i = 0; i < pattern.length; i += 1) {
    const moduleValue = pattern[i];
    if (moduleValue === "1") {
      const x = (i + QUIET_ZONE_MODULES) * MODULE_WIDTH;
      const isGuard = guardModuleIndices.has(i + QUIET_ZONE_MODULES);
      const barHeight = isGuard ? height * GUARD_HEIGHT_FACTOR : height;
      ctx.fillRect(x, 0, MODULE_WIDTH, barHeight);
    }
  }

  ctx.font = `${DIGIT_FONT_WEIGHT} ${DIGIT_FONT_SIZE}px ${DIGIT_FONT_FAMILY}`;
  ctx.textBaseline = "top";
  const textY = height + DIGIT_MARGIN_TOP;
  ctx.fillText(
    digits[0] ?? "",
    QUIET_ZONE_MODULES * MODULE_WIDTH - 10 - FIRST_DIGIT_EXTRA_LEFT,
    textY,
  );

  const leftDigits = digits.slice(1, 7);
  const rightDigits = digits.slice(7);
  const leftStart = (QUIET_ZONE_MODULES + 3) * MODULE_WIDTH;
  const rightStart = (QUIET_ZONE_MODULES + 3 + 42 + 5) * MODULE_WIDTH;
  const digitSpacing = MODULE_WIDTH * 7;

  for (let i = 0; i < leftDigits.length; i += 1) {
    ctx.fillText(leftDigits[i] ?? "", leftStart + i * digitSpacing + 6, textY);
  }
  for (let i = 0; i < rightDigits.length; i += 1) {
    ctx.fillText(rightDigits[i] ?? "", rightStart + i * digitSpacing + 6, textY);
  }

  trimCanvasWhitespace(canvas);
}

export default function Home() {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [encoded, setEncoded] = useState<{ digits: string; pattern: string } | null>(null);
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
    if (!encoded) return undefined;
    if (!canvasRef.current) return undefined;

    let cancelled = false;
    const canvas = canvasRef.current;

    const render = async () => {
      if (typeof document !== "undefined" && "fonts" in document) {
        try {
          await document.fonts.load(`${DIGIT_FONT_WEIGHT} ${DIGIT_FONT_SIZE}px ${DIGIT_FONT_PRIMARY}`);
          await document.fonts.ready;
        } catch {
          // Ignore font loading errors and render with available fonts.
        }
      }

      if (!cancelled && canvas) {
        drawBarcode(canvas, encoded.digits, encoded.pattern);
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [encoded]);

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `ean-${encoded?.digits ?? "barcode"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [encoded]);

  const helperText = useMemo(() => {
    if (!encoded) {
      return "Klistra in 12 eller 13 siffror. Kontrollsiffran räknas ut automatiskt om du bara anger 12.";
    }
    return `Kontrollsiffran är ${encoded.digits.slice(-1)} (full kod: ${encoded.digits}).`;
  }, [encoded]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleGenerate();
    },
    [handleGenerate]
  );

  return (
    <div className="space-y-10">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 mt-10">Skapa EAN</h1>
        <p className="text-sm text-neutral-600">
          Skapa en streckkod från en EAN-13-kod och ladda ner den som PNG för att använda i dina
          material.
        </p>
      </div>

      <section className="space-y-6 rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900">Generera streckkod</h2>
          <p className="text-sm text-neutral-600">
            Ange en giltig EAN-13-kod så ritar vi upp streckkoden och kontrollerar siffrorna åt dig.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700" htmlFor="ean-input">
              EAN-13-kod
            </label>
            <Input
              id="ean-input"
              value={input}
              onChange={(event) => setInput(event.target.value.replace(/\s+/g, ""))}
              placeholder="Exempel: 731869011290"
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs text-neutral-500">{helperText}</p>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button type="submit">Generera streckkod</Button>
            <Button type="button" disabled={!encoded} onClick={handleDownload} variant="outline">
              Ladda ner PNG
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Förhandsgranskning</h2>
        {encoded ? (
          <div className="flex flex-col items-center gap-4">
            <canvas ref={canvasRef} className="max-w-full" aria-label="Genererad streckkod" />
            <code
              className="rounded-2xl bg-neutral-100 px-4 py-2 text-base font-semibold tracking-[0.2em] text-neutral-800"
              style={{
                fontFamily: DIGIT_FONT_FAMILY,
                fontSize: DIGIT_FONT_SIZE,
                fontWeight: DIGIT_FONT_WEIGHT,
              }}
            >
              {encoded.digits}
            </code>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">Ingen streckkod genererad ännu.</p>
        )}
      </section>
    </div>
  );
}