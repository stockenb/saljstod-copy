"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { jsPDF } from "jspdf";
import { sanitizePdfText, sanitizePdfTextArray } from "@/lib/pdf/text";
import {
  analyzeProductTitles,
  extractSizeTokens,
  tokenizeTitle,
} from "@/lib/product-title";
import { Search, Plus, Trash2, FileDown, ImageOff, RotateCcw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Specification = {
  key: string;
  value: string;
};

type ProductFormData = {
  articleNumber: string;
  title: string;
  link: string;
  image: string;
  description: string;
  weight: string;
  specs: Specification[];
  logo: string;
};

type ProductApiData = Omit<ProductFormData, "logo">;

type FetchState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

type PdfState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

type PdfImage = {
  dataUrl: string;
  format: "PNG" | "JPEG" | "WEBP";
};

type ArticleSuggestion = {
  articleNumber: string;
  title: string;
  link: string;
};

const LOGO_IMAGE_PATH = "/na_foretag.png";

const POPPINS_FONT_URLS = {
  regular: "https://cdn.jsdelivr.net/npm/@fontsource/poppins/files/poppins-latin-400-normal.ttf",
  semiBold: "https://cdn.jsdelivr.net/npm/@fontsource/poppins/files/poppins-latin-600-normal.ttf",
} as const;

const POPPINS_FONT_FILES = {
  regular: "Poppins-Regular.ttf",
  semiBold: "Poppins-SemiBold.ttf",
} as const;

type PoppinsFontVariant = keyof typeof POPPINS_FONT_URLS;

const poppinsFontCache: Partial<Record<PoppinsFontVariant, string>> = {};

const initialForm: ProductFormData = {
  articleNumber: "",
  title: "",
  link: "",
  image: "",
  description: "",
  weight: "",
  specs: [],
  logo: LOGO_IMAGE_PATH,
};

const contactDetails = [
  "Nils Ahlgren AB • Rörvägen 16, 136 50 Jordbro",
  "info@nilsahlgren.se • +46 8 500 125 80 • www.nilsahlgren.se",
];

const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;

function deriveSizeValue(product: { articleNumber?: string | null; title?: string | null }) {
  const analysis = analyzeProductTitles([
    { articleNumber: product.articleNumber ?? "", title: product.title ?? "" },
  ]);
  const tokens = tokenizeTitle((product.title ?? "").trim());
  const sizeTokens = extractSizeTokens(
    tokens,
    analysis.prefixTokens,
    analysis.suffixTokens,
  );
  const sizeText = sizeTokens.join(" ").trim();
  const fallback = (product.title ?? "").trim();

  return sizeText || fallback || null;
}

function upsertSizeSpecification(specs: Specification[], sizeValue: string | null) {
  if (!sizeValue) {
    return specs;
  }

  const trimmedValue = sizeValue.trim();
  if (!trimmedValue) {
    return specs;
  }

  const existingIndex = specs.findIndex(
    (spec) => spec.key.trim().toLowerCase() === "storlek",
  );

  if (existingIndex >= 0) {
    const existing = specs[existingIndex];
    if (existing.value.trim()) {
      return specs;
    }

    const next = [...specs];
    next[existingIndex] = { ...existing, value: trimmedValue };
    return next;
  }

  return [{ key: "Storlek", value: trimmedValue }, ...specs];
}

function normalizeUrl(raw: string): string {
  if (!raw) return raw;
  if (raw.startsWith("data:image/")) return raw;

  try {
    const [base, rest] = raw.split(/([?#].*)/);
    return encodeURI(base) + (rest ?? "");
  } catch {
    return raw.replace(/ /g, "%20");
  }
}

async function loadHtmlImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function rasterizeToJpeg(
  pdfImage: PdfImage,
  quality = 0.92
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadHtmlImageFromDataUrl(pdfImage.dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kunde inte skapa 2D-kontext");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return {
    dataUrl,
    width: canvas.width,
    height: canvas.height,
  };
}

async function convertImageToDataUrl(source: string): Promise<PdfImage | null> {
  if (!source) {
    return null;
  }
  const src = normalizeUrl(source);

  const parseDataUrl = (dataUrl: string): PdfImage | null => {
    const formatMatch = dataUrl.match(/^data:image\/(png|jpe?g|webp)/i);
    const format = (formatMatch?.[1] ?? "png").toLowerCase();
    if (format === "jpg" || format === "jpeg") {
      return { dataUrl, format: "JPEG" };
    }
    if (format === "webp") {
      return { dataUrl, format: "WEBP" };
    }
    return { dataUrl, format: "PNG" };
  };

  if (src.startsWith("data:image/")) {
    return parseDataUrl(src);
  }

  const blobToPdfImage = async (blob: Blob) =>
    new Promise<PdfImage | null>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          resolve(null);
          return;
        }
        resolve(parseDataUrl(result));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  const tryDirectFetch = async () => {
    try {
      const response = await fetch(src);
      if (!response.ok) {
        return null;
      }
      const blob = await response.blob();
      return await blobToPdfImage(blob);
    } catch (error) {
      console.warn("Kunde inte läsa in bilden direkt", error);
      return null;
    }
  };

  const tryProxyFetch = async () => {
    try {
      const proxyUrl = `/api/produktblad/image?src=${encodeURIComponent(src)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        return null;
      }

      const data = (await response.json().catch(() => null)) as { dataUrl?: string } | null;

      if (!data?.dataUrl) {
        return null;
      }

      return parseDataUrl(data.dataUrl);
    } catch (error) {
      console.error("Kunde inte proxy-ladda bilden", error);
      return null;
    }
  };

  const directImage = await tryDirectFetch();
  if (directImage) {
    return directImage;
  }

  return await tryProxyFetch();
}

const logoImageCache = new Map<string, PdfImage | null>();

async function loadLogoImage(source: string) {
  const key = source || LOGO_IMAGE_PATH;

  if (logoImageCache.has(key)) {
    return logoImageCache.get(key) ?? null;
  }

  const image = await convertImageToDataUrl(key);
  logoImageCache.set(key, image ?? null);
  return image ?? null;
}

function createFilename(form: ProductFormData) {
  const base = form.title || form.articleNumber || "produktblad";
  return `${base}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .concat(".pdf");
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return typeof window === "undefined" ? "" : window.btoa(binary);
}

async function loadFontBase64(variant: PoppinsFontVariant) {
  if (poppinsFontCache[variant]) {
    return poppinsFontCache[variant] as string;
  }

  const response = await fetch(POPPINS_FONT_URLS[variant]);
  if (!response.ok) {
    throw new Error(`Kunde inte ladda fonten ${variant}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  if (!base64) {
    throw new Error("Kunde inte konvertera fonten till base64");
  }
  poppinsFontCache[variant] = base64;
  return base64;
}

async function ensurePoppinsFonts(doc: jsPDF) {
  try {
    const [regular, semiBold] = await Promise.all([loadFontBase64("regular"), loadFontBase64("semiBold")]);

    doc.addFileToVFS(POPPINS_FONT_FILES.regular, regular);
    doc.addFont(POPPINS_FONT_FILES.regular, "Poppins", "normal", "Identity-H");
    doc.addFileToVFS(POPPINS_FONT_FILES.semiBold, semiBold);
    doc.addFont(POPPINS_FONT_FILES.semiBold, "Poppins", "bold", "Identity-H");

    return true;
  } catch (error) {
    console.warn("Kunde inte ladda Poppins", error);
    return false;
  }
}

const inputCls = "w-full rounded-xl border border-white/[0.32] bg-white/[0.13] px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:bg-white/[0.10] focus:ring-1 focus:ring-violet-500/30";
const labelCls = "block text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500 mb-1.5";

export default function ProduktbladPage() {
  const [lookupId, setLookupId] = useState("");
  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle", message: "" });
  const [pdfState, setPdfState] = useState<PdfState>({ status: "idle", message: "" });
  const [suggestions, setSuggestions] = useState<ArticleSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const blurTimeoutRef = useRef<number | null>(null);

  const hasSpecs = form.specs.length > 0;

  const clearBlurTimeout = useCallback(() => {
    if (blurTimeoutRef.current !== null) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearBlurTimeout(), [clearBlurTimeout]);

  useEffect(() => {
    const trimmed = lookupId.trim();

    if (trimmed.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("q", trimmed);
        params.set("limit", "8");
        const response = await fetch(`/api/artikelbas/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Sökningen misslyckades med status ${response.status}`);
        }

        const data = (await response.json()) as { articles: ArticleSuggestion[] };
        setSuggestions(data.articles);
        setShowSuggestions(data.articles.length > 0);
        setActiveSuggestionIndex(-1);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Kunde inte hämta artikel-förslag", error);
        setSuggestions([]);
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [lookupId]);

  const handleLookup = useCallback(async () => {
    const trimmed = lookupId.trim();

    if (!trimmed) {
      setFetchState({ status: "error", message: "Ange ett artikelnummer att söka på." });
      return;
    }

    setFetchState({ status: "loading", message: "Hämtar artikelinformation..." });

    try {
      const response = await fetch(`/api/produktblad?id=${encodeURIComponent(trimmed)}`);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setFetchState({
          status: "error",
          message: body?.error ?? "Kunde inte hitta artikel i flödet.",
        });
        return;
      }

      const data = (await response.json()) as { product: ProductApiData };

      const specs = Array.isArray(data.product.specs) ? data.product.specs : [];
      const sizeValue = deriveSizeValue({
        articleNumber: data.product.articleNumber ?? trimmed,
        title: data.product.title ?? "",
      });
      const nextSpecs = upsertSizeSpecification(specs, sizeValue);

      setForm((previous) => ({
        ...previous,
        articleNumber: data.product.articleNumber ?? trimmed,
        title: data.product.title ?? "",
        link: data.product.link ?? "",
        image: data.product.image ?? "",
        description: data.product.description ?? "",
        weight: data.product.weight ?? "",
        specs: nextSpecs,
        logo: previous.logo || LOGO_IMAGE_PATH,
      }));
      setLookupId(data.product.articleNumber ?? trimmed);
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      setPdfState({ status: "idle", message: "" });
      setFetchState({ status: "success", message: "Artikelinformation hämtad." });
    } catch (error) {
      console.error("Kunde inte hämta produkt", error);
      setFetchState({
        status: "error",
        message: "Kunde inte hämta data just nu. Försök igen senare.",
      });
    }
  }, [lookupId]);

  const handleSelectSuggestion = useCallback(
    (suggestion: ArticleSuggestion) => {
      clearBlurTimeout();
      setLookupId(suggestion.articleNumber);
      setShowSuggestions(false);
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
    },
    [clearBlurTimeout],
  );

  const handleLookupFocus = useCallback(() => {
    clearBlurTimeout();
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [clearBlurTimeout, suggestions.length]);

  const handleLookupBlur = useCallback(() => {
    clearBlurTimeout();
    blurTimeoutRef.current = window.setTimeout(() => {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }, 150);
  }, [clearBlurTimeout]);

  const handleLookupKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        event.preventDefault();
        setShowSuggestions(true);
        setActiveSuggestionIndex((current) => {
          const nextIndex = current + 1;
          return nextIndex >= suggestions.length ? 0 : nextIndex;
        });
        return;
      }

      if (event.key === "ArrowUp" && suggestions.length > 0) {
        event.preventDefault();
        setShowSuggestions(true);
        setActiveSuggestionIndex((current) => {
          if (current <= 0) {
            return suggestions.length - 1;
          }
          return current - 1;
        });
        return;
      }

      if (event.key === "Enter") {
        if (showSuggestions && activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
          event.preventDefault();
          handleSelectSuggestion(suggestions[activeSuggestionIndex]);
          return;
        }

        event.preventDefault();
        void handleLookup();
        return;
      }

      if (event.key === "Escape") {
        if (showSuggestions) {
          event.preventDefault();
          setShowSuggestions(false);
          setActiveSuggestionIndex(-1);
        }
      }
    },
    [
      activeSuggestionIndex,
      handleLookup,
      handleSelectSuggestion,
      showSuggestions,
      suggestions,
    ],
  );

  const handleFormChange = (field: keyof ProductFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSpecChange = (index: number, field: keyof Specification, value: string) => {
    setForm((prev) => {
      const specs = [...prev.specs];
      specs[index] = { ...specs[index], [field]: value };
      return { ...prev, specs };
    });
  };

  const handleAddSpec = () => {
    setForm((prev) => ({ ...prev, specs: [...prev.specs, { key: "", value: "" }] }));
  };

  const handleSpecKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (index !== form.specs.length - 1) {
      return;
    }

    const currentSpec = form.specs[index];
    if (!currentSpec) {
      handleAddSpec();
      return;
    }

    if (currentSpec.key.trim() || currentSpec.value.trim()) {
      handleAddSpec();
    }
  };

  const handleRemoveSpec = (index: number) => {
    setForm((prev) => ({
      ...prev,
      specs: prev.specs.filter((_, specIndex) => specIndex !== index),
    }));
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, image: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, logo: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setForm((prev) => ({ ...prev, logo: LOGO_IMAGE_PATH }));
  };

  function hexToRgb(hex: string): [number, number, number] {
    const normalized = hex.trim().replace("#", "");
    const full =
      normalized.length === 3
        ? normalized
            .split("")
            .map((char) => char + char)
            .join("")
        : normalized;
    const num = Number.parseInt(full, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  const brandBlue = hexToRgb("#023562");

  const handleGeneratePdf = async () => {
    setPdfState({ status: "loading", message: "Genererar PDF..." });
    try {
      const [{ jsPDF }, autoTableModule, logoImage] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        loadLogoImage(form.logo || LOGO_IMAGE_PATH),
      ]);
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const fontsLoaded = await ensurePoppinsFonts(doc);
      const baseFont = fontsLoaded ? "Poppins" : "helvetica";
      const boldStyle = "bold";
      const normalStyle = "normal";
      const accentColor: [number, number, number] = [255, 83, 10];
      const headingColor: [number, number, number] = [30, 41, 59];
      const textColor: [number, number, number] = [51, 65, 85];

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 20;
      const contentWidth = pageWidth - marginX * 2;

      const logoTop = 6;
      let headerTop = 18;

      if (logoImage) {
        try {
          const logoProps = doc.getImageProperties(logoImage.dataUrl);
          const maxLogoWidth = 60;
          let logoWidth = maxLogoWidth;
          let logoHeight = (logoProps.height / logoProps.width) * logoWidth;

          if (logoHeight > 12) {
            logoHeight = 12;
            logoWidth = (logoProps.width / logoProps.height) * logoHeight;
          }

          const logoX = marginX;
          const logoY = logoTop;
          doc.addImage(logoImage.dataUrl, logoImage.format, logoX, logoY, logoWidth, logoHeight);

          headerTop = Math.max(headerTop, logoY + logoHeight + 6);
        } catch (logoError) {
          console.warn("Kunde inte lägga till logotyp i PDF", logoError);
        }
      }

      const [rb, gb, bb] = brandBlue;
      doc.setFillColor(rb, gb, bb);
      doc.roundedRect(marginX, headerTop, contentWidth, 26, 4, 4, "F");

      doc.setFont(baseFont, boldStyle);
      doc.setFontSize(19);
      doc.setTextColor(255, 255, 255);
      const pdfTitle = sanitizePdfText(form.title || "Produktblad");
      doc.text(pdfTitle, marginX + 8, headerTop + 12);

      if (form.articleNumber) {
        doc.setFont(baseFont, normalStyle);
        doc.setFontSize(11);
        doc.setTextColor(226, 232, 240);
        const articleLabel = sanitizePdfText(`Artikelnummer: ${form.articleNumber}`);
        doc.text(articleLabel, marginX + 8, headerTop + 20);
      }

      let currentY = headerTop + 34;
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      const image = await convertImageToDataUrl(form.image);
      const columnGap = 12;
      let columnWidth = contentWidth;
      let columnLimitY = currentY;
      let descriptionStartY = currentY;
      let imageLayout: { x: number; y: number; width: number; height: number; bottom: number } | null =
        null;

      if (image) {
        try {
          const raster = await rasterizeToJpeg(image);

          const maxImageWidth = 70;
          const maxImageHeight = 70;
          let imageWidth = maxImageWidth;
          let imageHeight = (raster.height / raster.width) * imageWidth;

          if (imageHeight > maxImageHeight) {
            imageHeight = maxImageHeight;
            imageWidth = (raster.width / raster.height) * imageHeight;
          }

          const imageX = marginX + contentWidth - imageWidth;
          const imageY = currentY;
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(imageX - 1, imageY - 1, imageWidth + 2, imageHeight + 2, 3, 3);

          doc.addImage(raster.dataUrl, "JPEG", imageX, imageY, imageWidth, imageHeight);

          imageLayout = {
            x: imageX,
            y: imageY,
            width: imageWidth,
            height: imageHeight,
            bottom: imageY + imageHeight,
          };
          columnWidth = Math.max(imageX - marginX - columnGap, 40);
          columnLimitY = imageLayout.bottom + 20;
        } catch (imageError) {
          console.warn("Kunde inte lägga till bild i PDF", imageError);
        }
      }

      let buttonLayout: { x: number; y: number; width: number; height: number; bottom: number } | null =
        null;

      if (form.link) {
        const buttonLabel = sanitizePdfText("Öppna produktsidan");
        doc.setFont(baseFont, boldStyle);
        const labelWidth = doc.getStringUnitWidth(buttonLabel) * (doc.getFontSize() / doc.internal.scaleFactor);
        const paddingX = 6;
        const paddingY = 3;
        const buttonWidth = labelWidth + paddingX * 2;
        const buttonHeight = doc.getFontSize() / doc.internal.scaleFactor + paddingY * 2;
        const buttonX = imageLayout ? imageLayout.x : marginX;
        const buttonY = imageLayout ? imageLayout.bottom + 6 : currentY + 1;

        buttonLayout = {
          x: buttonX,
          y: buttonY,
          width: buttonWidth,
          height: buttonHeight,
          bottom: buttonY + buttonHeight,
        };

        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.roundedRect(buttonLayout.x, buttonLayout.y, buttonLayout.width, buttonLayout.height, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.text(buttonLabel, buttonLayout.x + paddingX, buttonLayout.y + buttonHeight - paddingY - 1);
        doc.link(buttonLayout.x, buttonLayout.y, buttonLayout.width, buttonLayout.height, { url: form.link });

        doc.setFont(baseFont, normalStyle);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        if (imageLayout) {
          columnLimitY = Math.max(columnLimitY, buttonLayout.bottom);
        } else {
          columnLimitY = buttonLayout.bottom;
          descriptionStartY = buttonLayout.bottom + 12;
        }
      } else if (!imageLayout) {
        descriptionStartY = currentY;
      }

      if (imageLayout && !form.link) {
        descriptionStartY = currentY;
      }

      let descriptionBottom = Math.max(descriptionStartY, columnLimitY);

      if (form.description) {
        doc.setFont(baseFont, boldStyle);
        doc.setFontSize(13);
        doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
        doc.text("Produktbeskrivning", marginX, currentY);

        let textBaseline = descriptionStartY + 8;
        doc.setFont(baseFont, normalStyle);
        doc.setFontSize(11);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        const lineHeight = (doc.getFontSize() * doc.getLineHeightFactor()) / doc.internal.scaleFactor;
        let lastLineBaseline: number | null = null;

        const paragraphs = form.description.split(/\r?\n\s*\r?\n/);

        for (const [index, paragraph] of paragraphs.entries()) {
          const normalizedParagraph = sanitizePdfText(paragraph.replace(/\r?\n/g, " ").trim());

          if (index > 0) {
            textBaseline += lineHeight;
          }

          if (!normalizedParagraph) {
            continue;
          }

          const words = normalizedParagraph.split(/\s+/);
          let currentLine = "";

          const writeLine = (line: string) => {
            if (!line) {
              return;
            }

            const maxWidth = imageLayout && textBaseline < columnLimitY ? columnWidth : contentWidth;
            const safeLine = sanitizePdfText(line);
            const lineWidth =
              doc.getStringUnitWidth(safeLine) * (doc.getFontSize() / doc.internal.scaleFactor);

            if (lineWidth > maxWidth) {
              const forcedLines = doc.splitTextToSize(safeLine, maxWidth).map(sanitizePdfText);
              for (const forcedLine of forcedLines) {
                doc.text(forcedLine, marginX, textBaseline);
                lastLineBaseline = textBaseline;
                textBaseline += lineHeight;
              }
            } else {
              doc.text(safeLine, marginX, textBaseline);
              lastLineBaseline = textBaseline;
              textBaseline += lineHeight;
            }
          };

          for (const word of words) {
            const maxWidth = imageLayout && textBaseline < columnLimitY ? columnWidth : contentWidth;
            const candidate = currentLine ? `${currentLine} ${word}` : word;
            const safeCandidate = sanitizePdfText(candidate);
            const candidateWidth =
              doc.getStringUnitWidth(safeCandidate) * (doc.getFontSize() / doc.internal.scaleFactor);

            if (candidateWidth <= maxWidth) {
              currentLine = safeCandidate;
            } else {
              writeLine(currentLine);
              currentLine = "";

              const updatedMaxWidth = imageLayout && textBaseline < columnLimitY ? columnWidth : contentWidth;
              const safeWord = sanitizePdfText(word);
              const wordWidth =
                doc.getStringUnitWidth(safeWord) * (doc.getFontSize() / doc.internal.scaleFactor);

              if (wordWidth > updatedMaxWidth) {
                const forcedLines = doc.splitTextToSize(safeWord, updatedMaxWidth).map(sanitizePdfText);
                for (const forcedLine of forcedLines) {
                  doc.text(forcedLine, marginX, textBaseline);
                  lastLineBaseline = textBaseline;
                  textBaseline += lineHeight;
                }
              } else {
                currentLine = safeWord;
              }
            }
          }

          if (currentLine) {
            writeLine(currentLine);
          }
        }

        if (lastLineBaseline) {
          descriptionBottom = Math.max(columnLimitY, lastLineBaseline + 6);
        } else {
          descriptionBottom = Math.max(columnLimitY, descriptionStartY + 6);
        }
      }
      const layoutBottom = Math.max(columnLimitY, descriptionBottom);
      currentY = layoutBottom + 12;

      const body = form.specs
        .filter((spec) => spec.key.trim() || spec.value.trim())
        .map((spec) => [
          sanitizePdfText(spec.key.trim() || "Specifikation"),
          sanitizePdfText(spec.value.trim()),
        ]);

      if (body.length > 0) {
        if (currentY + 40 > pageHeight - 30) {
          doc.addPage();
          currentY = 30;
        }

        doc.setFont(baseFont, boldStyle);
        doc.setFontSize(13);
        doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
        doc.text("Specifikationer", marginX, currentY);
        currentY += 6;

        autoTable(doc, {
          startY: currentY,
          margin: { left: marginX, right: marginX },
          head: [["Egenskap", "Värde"]],
          body,
          styles: {
            font: baseFont,
            fontStyle: normalStyle,
            fontSize: 10,
            textColor,
            cellPadding: 3,
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [rb, gb, bb],
            textColor: [255, 255, 255],
            font: baseFont,
            fontStyle: boldStyle,
            fontSize: 11,
            halign: "left",
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
          tableLineColor: [226, 232, 240],
          tableLineWidth: 0.1,
        });

        const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
        if (finalY) {
          currentY = finalY + 10;
        }
      }

      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 30;
      }

      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, pageHeight - 26, pageWidth - marginX, pageHeight - 26);

      doc.setFont(baseFont, normalStyle);
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const footerY = pageHeight - 16;
      sanitizePdfTextArray(contactDetails).forEach((line, index) => {
        doc.text(line, marginX, footerY + index * 5);
      });

      doc.save(createFilename(form));

      setPdfState({ status: "success", message: "Produktblad sparat." });
    } catch (error) {
      console.error("Misslyckades att generera PDF", error);
      setPdfState({
        status: "error",
        message: "Kunde inte skapa PDF. Kontrollera fälten och försök igen.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-10">

      {/* Header */}
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-violet-400 uppercase">
          Verktyg
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-100" style={{ letterSpacing: "-0.02em" }}>
          Skapa produktblad
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Hämta artikelinformation från produktflödet, justera innehållet och exportera ett färdigt produktblad som PDF.
        </p>
      </div>

      {/* Sök / Hämta */}
      <section className="rounded-2xl border border-white/[0.30] bg-white/[0.16]">
        <div className="border-b border-white/[0.22] px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-200">Hämta från artikelnummer</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Ange artikelnummer eller söktext för att fylla i produktbladet automatiskt.
          </p>
        </div>
        <div className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={lookupId}
                onChange={(event) => {
                  setLookupId(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={handleLookupFocus}
                onBlur={handleLookupBlur}
                onKeyDown={handleLookupKeyDown}
                placeholder="Till exempel 12345 eller grind…"
                aria-label="Artikelnummer eller söktext att hämta"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && suggestions.length > 0}
                aria-controls="produktblad-article-suggestions"
                autoComplete="off"
                className="w-full rounded-xl border border-white/[0.32] bg-white/[0.13] py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:bg-white/[0.10] focus:ring-1 focus:ring-violet-500/30"
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul
                  id="produktblad-article-suggestions"
                  role="listbox"
                  className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-2xl border border-white/[0.30] shadow-2xl shadow-black/40"
                  style={{ background: "#13142a" }}
                >
                  {suggestions.map((suggestion, index) => {
                    const isActive = index === activeSuggestionIndex;
                    return (
                      <li key={`${suggestion.articleNumber}-${index}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          className={`flex w-full flex-col items-start px-4 py-2.5 text-left text-sm transition-colors ${
                            isActive
                              ? "bg-violet-500/15 text-gray-100"
                              : "text-gray-300 hover:bg-white/[0.13]"
                          }`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            clearBlurTimeout();
                          }}
                          onClick={() => handleSelectSuggestion(suggestion)}
                        >
                          <span className="font-mono text-xs font-semibold text-violet-300">
                            {suggestion.articleNumber}
                          </span>
                          <span className="text-xs text-gray-500">{suggestion.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <button
              onClick={() => void handleLookup()}
              disabled={fetchState.status === "loading"}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {fetchState.status === "loading" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Hämtar…</>
              ) : (
                "Hämta uppgifter"
              )}
            </button>
          </div>

          {fetchState.message && (
            <div className={`mt-3 flex items-center gap-2 text-xs ${
              fetchState.status === "error" ? "text-red-400" :
              fetchState.status === "success" ? "text-emerald-400" : "text-gray-500"
            }`}>
              {fetchState.status === "error" && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
              {fetchState.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
              {fetchState.message}
            </div>
          )}
        </div>
      </section>

      {/* Formulär */}
      <section className="overflow-hidden rounded-2xl border border-white/[0.30] bg-white/[0.16]">
        <div className="border-b border-white/[0.22] px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-200">Produktinformation</h2>
          <p className="mt-0.5 text-xs text-gray-500">Justera fälten innan du skapar PDF:en.</p>
        </div>

        <div className="p-6 space-y-8">
          {/* Tvåkolumnsgrid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Vänster: basdata */}
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Artikelnummer</label>
                <input
                  className={inputCls}
                  value={form.articleNumber}
                  onChange={(event) => {
                    handleFormChange("articleNumber", event.target.value);
                    setLookupId(event.target.value);
                  }}
                  placeholder="Fyll i artikelnummer"
                />
              </div>
              <div>
                <label className={labelCls}>Benämning</label>
                <input
                  className={inputCls}
                  value={form.title}
                  onChange={(event) => handleFormChange("title", event.target.value)}
                  placeholder="Skriv benämning"
                />
              </div>
              <div>
                <label className={labelCls}>Länk till webbshop</label>
                <input
                  className={inputCls}
                  value={form.link}
                  onChange={(event) => handleFormChange("link", event.target.value)}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className={labelCls}>Vikt</label>
                <input
                  className={inputCls}
                  value={form.weight}
                  onChange={(event) => handleFormChange("weight", event.target.value)}
                  placeholder="Till exempel 3 kg"
                />
              </div>
            </div>

            {/* Höger: bild & logotyp */}
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Bildadress</label>
                <input
                  className={inputCls}
                  value={form.image}
                  onChange={(event) => handleFormChange("image", event.target.value)}
                  placeholder="Klistra in bild-URL eller ladda upp nedan"
                />
                <p className="mt-1.5 text-[11px] text-gray-600">
                  Om bilden saknas kan du ange en ny URL eller ladda upp en ersättningsbild.
                </p>
              </div>

              <div>
                <label className={labelCls}>Ladda upp bild</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/[0.32] bg-white/[0.08] px-4 py-3 text-sm text-gray-500 transition-colors hover:border-violet-500/40 hover:text-gray-400">
                  <ImageOff className="h-4 w-4 shrink-0" />
                  <span>Välj bildfil…</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
                </label>
              </div>

              {/* Bildförhandsgranskning */}
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-xl border border-white/[0.12] bg-white/[0.08]">
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="Produktbild" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-600">Ingen bild vald ännu</span>
                )}
              </div>

              {/* Logotyp */}
              <div>
                <label className={labelCls}>Logotyp i PDF</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/[0.32] bg-white/[0.08] px-4 py-3 text-sm text-gray-500 transition-colors hover:border-violet-500/40 hover:text-gray-400">
                  <span>Ladda upp egen logotyp…</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="sr-only" />
                </label>
                <p className="mt-1.5 text-[11px] text-gray-600">
                  Ersätter standardlogotypen i det exporterade produktbladet.
                </p>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.12] bg-white/[0.08] px-4 py-3">
                  <div className="flex items-center">
                    {form.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.logo}
                        alt="Logotyp"
                        className="h-8 w-auto max-w-[120px] object-contain brightness-0 invert opacity-80"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">Ingen logotyp</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleResetLogo}
                    disabled={form.logo === LOGO_IMAGE_PATH}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.14] px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:border-white/[0.24] hover:text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Återställ
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Beskrivning */}
          <div>
            <label className={labelCls}>Beskrivning</label>
            <textarea
              rows={5}
              className={`${inputCls} resize-none`}
              value={form.description}
              onChange={(event) => handleFormChange("description", event.target.value)}
              placeholder="Skriv eller klistra in produktbeskrivningen här"
            />
          </div>

          {/* Specifikationer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Specifikationer</h3>
                <p className="text-[11px] text-gray-600">{form.specs.length} st tillagda</p>
              </div>
              <button
                type="button"
                onClick={handleAddSpec}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.30] bg-white/[0.13] px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.12] hover:text-gray-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Lägg till
              </button>
            </div>

            {hasSpecs ? (
              <div className="space-y-2">
                {form.specs.map((spec, index) => (
                  <div
                    key={`spec-${index}`}
                    className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      value={spec.key}
                      onChange={(event) => handleSpecChange(index, "key", event.target.value)}
                      onKeyDown={(event) => handleSpecKeyDown(event, index)}
                      placeholder="Egenskap"
                      aria-label={`Specifikation ${index + 1}`}
                      className={inputCls}
                    />
                    <input
                      value={spec.value}
                      onChange={(event) => handleSpecChange(index, "value", event.target.value)}
                      onKeyDown={(event) => handleSpecKeyDown(event, index)}
                      placeholder="Värde"
                      aria-label={`Värde för specifikation ${index + 1}`}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(index)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      aria-label="Ta bort specifikation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.03] p-5 text-center">
                <p className="text-sm text-gray-600">
                  Inga specifikationer ännu. Lägg till egenskaper som ska visas i produktbladet.
                </p>
              </div>
            )}
          </div>

          {/* PDF-knapp */}
          <div className="flex flex-col gap-3 border-t border-white/[0.22] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {pdfState.message && (
                <div className={`flex items-center gap-2 text-xs ${
                  pdfState.status === "error" ? "text-red-400" :
                  pdfState.status === "success" ? "text-emerald-400" : "text-gray-500"
                }`}>
                  {pdfState.status === "error" && <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                  {pdfState.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                  {pdfState.status === "loading" && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                  {pdfState.message}
                </div>
              )}
            </div>
            <button
              onClick={() => void handleGeneratePdf()}
              disabled={pdfState.status === "loading"}
              className="flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:-translate-y-0.5 hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0"
            >
              {pdfState.status === "loading" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Skapar PDF…</>
              ) : (
                <><FileDown className="h-4 w-4" /> Spara produktblad som PDF</>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
