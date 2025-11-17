"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sanitizePdfText, sanitizePdfTextArray } from "@/lib/pdf/text";
import {
  analyzeProductTitles,
  extractSizeTokens,
  tokenizeTitle,
} from "@/lib/product-title";

type Specification = {
  key: string;
  value: string;
};

type ProductData = {
  articleNumber: string;
  title: string;
  link: string;
  image: string;
  description: string;
  weight: string;
  specs: Specification[];
};

type FetchState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

type PdfState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

const contactDetails = [
  "Nils Ahlgren AB • Rörvägen 16, 136 50 Jordbro",
  "info@nilsahlgren.se • +46 8 500 125 80 • www.nilsahlgren.se",
];

type PdfImage = {
  dataUrl: string;
  format: "PNG" | "JPEG" | "WEBP";
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

const EXCLUDED_SPEC_KEYS = new Set(["ean-kod", "benämning engelska", "vikt"]);

function deriveSizeValueFromTitle(
  title: string | null | undefined,
  prefixTokens: string[],
  suffixTokens: string[],
) {
  const trimmedTitle = (title ?? "").trim();

  if (!trimmedTitle) {
    return "";
  }

  const tokens = tokenizeTitle(trimmedTitle);
  const primarySizeTokens = extractSizeTokens(tokens, prefixTokens, suffixTokens);

  if (primarySizeTokens.length > 0 && primarySizeTokens.length < tokens.length) {
    return primarySizeTokens.join(" ").trim();
  }

  const fallbackAnalysis = analyzeProductTitles([{ title: trimmedTitle }]);
  const fallbackSizeTokens = extractSizeTokens(
    tokens,
    fallbackAnalysis.prefixTokens,
    fallbackAnalysis.suffixTokens,
  );

  return fallbackSizeTokens.join(" ").trim();
}

function normalizeSpecKey(label: string) {
  return label.trim().toLowerCase();
}

function normalizeSwedishDecimal(value: string): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, "").replace(/,/g, ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function findFirstNumericValue(text: string | null | undefined): number | null {
  if (!text) {
    return null;
  }

  const match = text.match(/\d+(?:[.,]\d+)?/);
  if (!match) {
    return null;
  }

  return normalizeSwedishDecimal(match[0]) ?? null;
}

function parseSizeMetrics(sizeText: string) {
  const normalizedSize = sizeText.replace(/,/g, ".");
  const match = normalizedSize.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);

  if (!match) {
    const fallback = findFirstNumericValue(sizeText);
    return {
      thickness: fallback,
      length: null as number | null,
    };
  }

  const [, thicknessRaw, lengthRaw] = match;
  const thickness = normalizeSwedishDecimal(thicknessRaw);
  const length = normalizeSwedishDecimal(lengthRaw);

  return { thickness, length };
}

function getSpecValue(
  specMap: Map<string, string>,
  matcher: (normalizedLabel: string) => boolean,
): string | null {
  for (const [label, value] of specMap.entries()) {
    if (matcher(normalizeSpecKey(label))) {
      return (value ?? "").trim() || null;
    }
  }

  return null;
}

function getPackagingValue(specMap: Map<string, string>) {
  return (
    getSpecValue(specMap, (label) => label === "primärförpackning") ??
    getSpecValue(specMap, (label) => label.includes("primärförpackning")) ??
    null
  );
}

function isPrimaryPackagingTypeLabel(normalizedLabel: string) {
  if (!normalizedLabel.includes("primärförp")) {
    return false;
  }

  return !normalizedLabel.includes("antal");
}

function isPrimaryPackagingQuantityLabel(normalizedLabel: string) {
  if (!normalizedLabel.includes("primärförp")) {
    return false;
  }

  return normalizedLabel.includes("antal");
}

const PACKAGING_RANK = {
  sb: 0,
  paket: 1,
  hink: 2,
  bulk: 3,
  other: 4,
} as const;

type PackagingRank = (typeof PACKAGING_RANK)[keyof typeof PACKAGING_RANK];

function normalizePackagingLabel(packaging: string | null | undefined) {
  return (packaging ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("sv-SE")
    .replace(/\s+/g, " ")
    .trim();
}

function isBulkPackaging(articleNumber: string, normalizedPackaging: string) {
  const normalizedArticleNumber = articleNumber.normalize("NFKC").toUpperCase();

  if (normalizedArticleNumber.startsWith("B")) {
    return true;
  }

  return (
    normalizedPackaging.includes("bulk") || normalizedPackaging.includes("kartong")
  );
}

function resolvePackagingRank(
  articleNumber: string,
  normalizedPackaging: string,
): PackagingRank {
  if (isBulkPackaging(articleNumber, normalizedPackaging)) {
    return PACKAGING_RANK.bulk;
  }

  if (
    normalizedPackaging.includes("sb") ||
    normalizedPackaging.includes("småpack") ||
    normalizedPackaging.includes("småförpackning")
  ) {
    return PACKAGING_RANK.sb;
  }

  if (normalizedPackaging.includes("paket")) {
    return PACKAGING_RANK.paket;
  }

  if (normalizedPackaging.includes("hink")) {
    return PACKAGING_RANK.hink;
  }

  return PACKAGING_RANK.other;
}

const QUANTITY_SPEC_PATTERNS = [
  "antal",
  "förpackning",
  "st/",
  "st per",
  "per förp",
  "per fp",
  "hink",
  "sb",
  "paket",
  "bulk",
  "kartong",
];

function resolvePackagingQuantity(
  specMap: Map<string, string>,
  packaging: string | null,
): number | null {
  const packagingQuantity = findFirstNumericValue(packaging ?? "");
  if (packagingQuantity !== null) {
    return packagingQuantity;
  }

  for (const [label, value] of specMap.entries()) {
    const normalizedLabel = normalizeSpecKey(label);
    if (!QUANTITY_SPEC_PATTERNS.some((pattern) => normalizedLabel.includes(pattern))) {
      continue;
    }

    const numericValue = findFirstNumericValue(value);
    if (numericValue !== null) {
      return numericValue;
    }
  }

  return null;
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

async function rasterizeToJpeg(pdfImage: PdfImage, quality = 0.92) {
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

let logoCache: PdfImage | null | undefined;

async function loadLogoImage() {
  if (typeof logoCache !== "undefined") {
    return logoCache;
  }

  logoCache = await convertImageToDataUrl(LOGO_IMAGE_PATH);
  return logoCache;
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
    doc.addFont(POPPINS_FONT_FILES.regular, "Poppins", "normal");
    doc.addFileToVFS(POPPINS_FONT_FILES.semiBold, semiBold);
    doc.addFont(POPPINS_FONT_FILES.semiBold, "Poppins", "bold");

    return true;
  } catch (error) {
    console.warn("Kunde inte ladda Poppins", error);
    return false;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.trim().replace("#", "");
  const full = sanitized.length === 3 ? sanitized.split("").map((char) => char + char).join("") : sanitized;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function createFilename(products: ProductData[]) {
  const { combinedTitle } = analyzeProductTitles(products);
  const fallback = products[0]?.articleNumber || "samlat-produktblad";
  const base = combinedTitle || fallback;
  return `${base}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .concat("-samlat.pdf");
}

function normalizeArticleNumbers(raw: string): string[] {
  return raw
    .split(/[\n,;\t ]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function CombinedProductSheetClientPage() {
  const searchParams = useSearchParams();
  const artiklarParam = searchParams.get("artiklar");
  const [articleInput, setArticleInput] = useState("");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle", message: "" });
  const [pdfState, setPdfState] = useState<PdfState>({ status: "idle", message: "" });
  const [sharedDescription, setSharedDescription] = useState("");
  const [hiddenSpecLabels, setHiddenSpecLabels] = useState<string[]>([]);

  const hasProducts = products.length > 0;

  const availableSpecLabels = useMemo(() => {
    const labels: string[] = [];
    const seen = new Set<string>();

    products.forEach((product) => {
      product.specs.forEach((spec) => {
        const label = spec.key.trim();

        if (!label) {
          return;
        }

        if (EXCLUDED_SPEC_KEYS.has(normalizeSpecKey(label))) {
          return;
        }

        if (seen.has(label)) {
          return;
        }

        seen.add(label);
        labels.push(label);
      });
    });

    return labels;
  }, [products]);

  const visibleSpecLabels = useMemo(() => {
    const hiddenSet = new Set(hiddenSpecLabels);
    return availableSpecLabels.filter((label) => !hiddenSet.has(label));
  }, [availableSpecLabels, hiddenSpecLabels]);

  useEffect(() => {
    setHiddenSpecLabels((previous) =>
      previous.filter((label) => availableSpecLabels.includes(label)),
    );
  }, [availableSpecLabels]);

  const articleGridTemplate = useMemo(
    () =>
      [
        "minmax(140px, 0.9fr)",
        "minmax(220px, 1.4fr)",
        "minmax(140px, 1fr)",
        "minmax(140px, 1fr)",
        "minmax(90px, 0.6fr)",
      ].join(" "),
    [],
  );

  const fetchMessageStyles = useMemo(() => {
    switch (fetchState.status) {
      case "error":
        return "text-sm text-danger";
      case "success":
        return "text-sm text-emerald-600";
      case "loading":
        return "text-sm text-neutral-500";
      default:
        return "text-sm text-neutral-500";
    }
  }, [fetchState.status]);

  const pdfMessageStyles = useMemo(() => {
    switch (pdfState.status) {
      case "error":
        return "text-sm text-danger";
      case "success":
        return "text-sm text-emerald-600";
      case "loading":
        return "text-sm text-neutral-500";
      default:
        return "text-sm text-neutral-500";
    }
  }, [pdfState.status]);

  const fetchProductsForNumbers = useCallback(async (numbers: string[]) => {
    if (numbers.length === 0) {
      setFetchState({ status: "error", message: "Ange minst ett artikelnummer." });
      setProducts([]);
      return;
    }

    setFetchState({ status: "loading", message: "Hämtar artiklar..." });

    const requests = numbers.map(async (articleNumber) => {
      const response = await fetch(`/api/produktblad?id=${encodeURIComponent(articleNumber)}`);

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Kunde inte hämta artikel.");
      }

      const data = (await response.json()) as { product: ProductData };
      return data.product;
    });

    try {
      const results = await Promise.allSettled(requests);
      const successful: ProductData[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successful.push(result.value);
          return;
        }

        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason ?? "Okänt fel");
        errors.push(`Artikel ${numbers[index]}: ${reason}`);
      });

      if (successful.length === 0) {
        setFetchState({ status: "error", message: errors.join("\n") || "Inga artiklar kunde hämtas." });
        setProducts([]);
        return;
      }

      setProducts(successful);
      setSharedDescription(successful[0]?.description ?? "");
      setHiddenSpecLabels([]);

      if (errors.length > 0) {
        setFetchState({ status: "error", message: `Kunde inte hämta vissa artiklar:\n${errors.join("\n")}` });
      } else {
        setFetchState({ status: "success", message: "Alla artiklar har hämtats." });
      }
    } catch (error) {
      console.error(error);
      setFetchState({ status: "error", message: "Ett oväntat fel inträffade." });
    }
  }, []);

  const handleFetchProducts = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numbers = Array.from(new Set(normalizeArticleNumbers(articleInput)));

    await fetchProductsForNumbers(numbers);
  };

  useEffect(() => {
    if (!artiklarParam) {
      return;
    }

    const numbers = Array.from(new Set(normalizeArticleNumbers(artiklarParam)));

    if (numbers.length === 0) {
      return;
    }

    setArticleInput(numbers.join(", "));
    void fetchProductsForNumbers(numbers);
  }, [artiklarParam, fetchProductsForNumbers]);

  const updateProductField = (index: number, field: keyof ProductData, value: string) => {
    setProducts((previous) => {
      const next = [...previous];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleHideSpec = useCallback((label: string) => {
    setHiddenSpecLabels((previous) => {
      if (previous.includes(label)) {
        return previous;
      }

      return [...previous, label];
    });
  }, []);

  const handleShowSpec = useCallback((label: string) => {
    setHiddenSpecLabels((previous) => previous.filter((value) => value !== label));
  }, []);

  const handleRemoveProduct = (index: number) => {
    setProducts((previous) => {
      const next = previous.filter((_, productIndex) => productIndex !== index);

      if (next.length === 0) {
        setSharedDescription("");
        setHiddenSpecLabels([]);
      }

      return next;
    });
  };

  const handleGeneratePdf = async () => {
    if (products.length === 0) {
      setPdfState({ status: "error", message: "Lägg till minst en artikel innan du skapar PDF." });
      return;
    }

    setPdfState({ status: "loading", message: "Genererar PDF..." });

    try {
      const [{ jsPDF }, autoTableModule, logoImage] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
        loadLogoImage(),
      ]);
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const fontsLoaded = await ensurePoppinsFonts(doc);
      const baseFont = fontsLoaded ? "Poppins" : "helvetica";
      const boldStyle = "bold";
      const normalStyle = "normal";
      const headingColor: [number, number, number] = [30, 41, 59];
      const textColor: [number, number, number] = [51, 65, 85];
      const brandBlue = hexToRgb("#023562");

      const firstProduct = products[0];
      const descriptionForPdf = sharedDescription || "";
      const sharedImage = firstProduct?.image ?? "";
      const { combinedTitle, prefixTokens, suffixTokens } = analyzeProductTitles(products);

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
      // Ändra värdet nedan för att justera rubrikens textstorlek i det samlade produktbladet.
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      const pdfTitle = sanitizePdfText(combinedTitle || "Samlat produktblad");
      doc.text(pdfTitle, marginX + 8, headerTop + 12);

      doc.setFont(baseFont, normalStyle);
      doc.setFontSize(11);
      doc.setTextColor(226, 232, 240);
      doc.text(sanitizePdfText("Samlat produktblad"), marginX + 8, headerTop + 20);

      let currentY = headerTop + 34;
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      /*const articleNumbers = products.map((product) => product.articleNumber).filter(Boolean);
      if (articleNumbers.length > 0) {
        doc.setFont(baseFont, boldStyle);
        doc.setFontSize(13);
        doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
        doc.text("Artiklar i produktfamiljen", marginX, currentY);
        currentY += 6;

        doc.setFont(baseFont, normalStyle);
        doc.setFontSize(10.5);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        const articleLines = doc.splitTextToSize(articleNumbers.join(", "), contentWidth);
        const lineHeight = (doc.getFontSize() * doc.getLineHeightFactor()) / doc.internal.scaleFactor;
        doc.text(articleLines, marginX, currentY);
        currentY += articleLines.length * lineHeight + 6;
      }*/

      const image = await convertImageToDataUrl(sharedImage);
      const columnGap = 12;
      let columnWidth = contentWidth;
      let columnLimitY = currentY;
      let descriptionStartY = currentY;
      let imageLayout: { x: number; y: number; width: number; height: number; bottom: number } | null = null;

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
          columnLimitY = imageLayout.bottom + 6;
        } catch (imageError) {
          console.warn("Kunde inte lägga till bild i PDF", imageError);
        }
      }

      if (!imageLayout) {
        descriptionStartY = currentY;
      }

      let descriptionBottom = Math.max(descriptionStartY, columnLimitY);

      if (descriptionForPdf) {
        doc.setFont(baseFont, boldStyle);
        doc.setFontSize(13);
        doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
        doc.text("Produktbeskrivning", marginX, currentY);

        let textBaseline = currentY + 8;
        doc.setFont(baseFont, normalStyle);
        doc.setFontSize(11);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        const lineHeight = (doc.getFontSize() * doc.getLineHeightFactor()) / doc.internal.scaleFactor;
        let lastLineBaseline: number | null = null;

        const paragraphs = descriptionForPdf.split(/\r?\n\s*\r?\n/);

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
          descriptionBottom = Math.max(columnLimitY, textBaseline + 6);
        }
      }

      const layoutBottom = Math.max(columnLimitY, descriptionBottom);
      currentY = layoutBottom + 12;

      const displayValue = (value?: string) => {
        const trimmed = sanitizePdfText((value ?? "").trim());
        return trimmed || sanitizePdfText("-");
      };

      const hiddenSpecSet = new Set(hiddenSpecLabels);
      const specOrder: string[] = [];
      const rawEntries = products.map((product) => {
        const articleNumber = displayValue(product.articleNumber);
        const originalTitle = (product.title ?? "").trim();
        const tokens = tokenizeTitle(originalTitle);
        const specMap = new Map<string, string>();

        product.specs.forEach((spec) => {
          const label = spec.key.trim() || "Specifikation";
          if (EXCLUDED_SPEC_KEYS.has(normalizeSpecKey(label))) {
            return;
          }

          const trimmedValue = (spec.value ?? "").trim();
          if (!specOrder.includes(label)) {
            specOrder.push(label);
          }
          specMap.set(label, trimmedValue);
        });

        return { articleNumber, originalTitle, tokens, specMap };
      });

      const prefixLength = prefixTokens.length;
      const suffixLength = suffixTokens.length;

      const articleEntries = rawEntries.map((entry) => {
        const sizeText = deriveSizeValueFromTitle(
          entry.originalTitle,
          prefixTokens,
          suffixTokens,
        );
        const packaging = getPackagingValue(entry.specMap);

        return {
          articleNumber: entry.articleNumber,
          size: displayValue(sizeText || entry.originalTitle),
          specMap: entry.specMap,
          packaging,
        };
      });

      const visibleSpecOrder = specOrder.filter((label) => !hiddenSpecSet.has(label));

      const sharedSpecLabels = visibleSpecOrder.filter((label) => {
        const firstValue = (rawEntries[0]?.specMap.get(label) ?? "").trim();
        if (!firstValue) {
          return false;
        }

        return rawEntries.every((entry) => {
          const value = (entry.specMap.get(label) ?? "").trim();
          return value && value.toLowerCase() === firstValue.toLowerCase();
        });
      });

      const sharedSpecs = sharedSpecLabels.map((label) => ({
        label: sanitizePdfText(label),
        value: displayValue(rawEntries[0]?.specMap.get(label)),
      }));

      const remainingSpecLabels = visibleSpecOrder.filter(
        (label) => !sharedSpecLabels.includes(label),
      );
      const filteredSpecLabels = remainingSpecLabels.filter((label) =>
        rawEntries.some((entry) => (entry.specMap.get(label) ?? "").trim()),
      );

      if (sharedSpecs.length > 0) {
        if (currentY + 30 > pageHeight - 30) {
          doc.addPage();
          currentY = 30;
        }

        doc.setFont(baseFont, boldStyle);
        doc.setFontSize(13);
        doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
        doc.text("Specifikation", marginX, currentY);
        currentY += 6;

        autoTable(doc, {
          startY: currentY,
          margin: { left: marginX, right: marginX },
          head: [["Specifikation", "Värde"]],
          body: sharedSpecs.map((spec) => sanitizePdfTextArray([spec.label, spec.value])),
          styles: {
            font: baseFont,
            fontStyle: normalStyle,
            fontSize: 9,
            textColor,
            cellPadding: 2,
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [rb, gb, bb],
            textColor: [255, 255, 255],
            font: baseFont,
            fontStyle: boldStyle,
            fontSize: 9,
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
        } else {
          currentY += 20;
        }
      }

      if (articleEntries.length > 0) {
        if (currentY + 30 > pageHeight - 30) {
          doc.addPage();
          currentY = 30;
        }

        doc.setFont(baseFont, boldStyle);
        doc.setFontSize(13);
        doc.setTextColor(headingColor[0], headingColor[1], headingColor[2]);
        doc.text("Artiklar", marginX, currentY);
        currentY += 6;

        const headRow = sanitizePdfTextArray([
          "Artikelnummer",
          "Storlek",
          ...filteredSpecLabels.map((label) => sanitizePdfText(label)),
        ]);
        const tableBody = articleEntries
          .map((entry) => {
            const sizeMetrics = parseSizeMetrics(entry.size);
            const normalizedPackaging = normalizePackagingLabel(
              entry.packaging ?? null,
            );
            const packagingRank = resolvePackagingRank(
              entry.articleNumber,
              normalizedPackaging,
            );
            const packagingQuantity = resolvePackagingQuantity(
              entry.specMap,
              entry.packaging ?? null,
            );
            const isBulk = isBulkPackaging(
              entry.articleNumber,
              normalizedPackaging,
            );

            return {
              ...entry,
              sizeMetrics,
              packagingRank,
              packagingQuantity,
              isBulk,
            };
          })
          .sort((a, b) => {
            const thicknessA =
              a.sizeMetrics.thickness ?? Number.POSITIVE_INFINITY;
            const thicknessB =
              b.sizeMetrics.thickness ?? Number.POSITIVE_INFINITY;
            if (thicknessA !== thicknessB) {
              return thicknessA - thicknessB;
            }

            const lengthA = a.sizeMetrics.length ?? Number.POSITIVE_INFINITY;
            const lengthB = b.sizeMetrics.length ?? Number.POSITIVE_INFINITY;
            if (lengthA !== lengthB) {
              return lengthA - lengthB;
            }

            if (a.isBulk !== b.isBulk) {
              return a.isBulk ? 1 : -1;
            }

            if (a.packagingRank !== b.packagingRank) {
              return a.packagingRank - b.packagingRank;
            }

            const quantityA = a.packagingQuantity ?? Number.POSITIVE_INFINITY;
            const quantityB = b.packagingQuantity ?? Number.POSITIVE_INFINITY;
            if (quantityA !== quantityB) {
              return quantityA - quantityB;
            }

            const packagingCompare = (a.packaging ?? "").localeCompare(
              b.packaging ?? "",
              "sv-SE",
              { sensitivity: "accent" },
            );
            if (packagingCompare !== 0) {
              return packagingCompare;
            }

            return a.articleNumber.localeCompare(b.articleNumber, "sv-SE", {
              numeric: true,
              sensitivity: "base",
            });
          })
          .map((entry) => {
            const rowValues = filteredSpecLabels.map((label) =>
              displayValue(entry.specMap.get(label)),
            );
            return [
              displayValue(entry.articleNumber),
              entry.size,
              ...rowValues,
            ];
          });

        autoTable(doc, {
          startY: currentY,
          margin: { left: marginX, right: marginX },
          head: [headRow],
          body: tableBody.map((row) => sanitizePdfTextArray(row)),
          styles: {
            font: baseFont,
            fontStyle: normalStyle,
            fontSize: 8,
            textColor,
            cellPadding: 1.8,
            lineColor: [226, 232, 240],
            lineWidth: 0.1,
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: [rb, gb, bb],
            textColor: [255, 255, 255],
            font: baseFont,
            fontStyle: boldStyle,
            fontSize: 8.5,
            halign: "left",
          },
          columnStyles: {
            0: { fontStyle: boldStyle },
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

      doc.save(createFilename(products));
      setPdfState({ status: "success", message: "PDF genererad." });
    } catch (error) {
      console.error(error);
      setPdfState({ status: "error", message: "Kunde inte generera PDF." });
    }
  };

  return (
    <div className="space-y-10 mt-10">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Skapa samlat produktblad</h1>
        <p className="text-sm text-neutral-600">
          Ange flera artikelnummer för att skapa ett samlat produktblad för en hel produktfamilj.
        </p>
      </div>

      <section className="space-y-6 rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900">Artikelnummer</h2>
          <p className="text-sm text-neutral-600">
            Klistra in artikelnummer för de produkter som ska ingå. Vi hämtar informationen åt dig.
          </p>
        </div>
        <form onSubmit={handleFetchProducts} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-neutral-700" htmlFor="article-input">
              Artikelnummer
            </label>
            <Textarea
              id="article-input"
              rows={4}
              value={articleInput}
              onChange={(event) => setArticleInput(event.target.value)}
              placeholder="Exempel: 12345, 12346, 12347"
            />
            <p className="text-xs text-neutral-500">
              Separera artikelnummer med komma, mellanslag eller radbrytningar.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button type="submit" className="w-full sm:w-auto">
              Hämta artiklar
            </Button>
          </div>
        </form>
        {fetchState.message ? <p className={`${fetchMessageStyles} mt-1`}>{fetchState.message}</p> : null}
      </section>

      {hasProducts ? (
        <section className="space-y-6 rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-neutral-900">Artiklar</h2>
            <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              {pdfState.message ? <p className={pdfMessageStyles}>{pdfState.message}</p> : <span className="hidden sm:block" />}
              <Button type="button" onClick={handleGeneratePdf} variant="secondary" className="w-full sm:w-auto">
                Skapa samlat produktblad
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Specifikationer</h3>
                <p className="text-sm text-neutral-600">
                  Välj vilka specifikationer som ska visas i listan och i PDF:en.
                </p>
              </div>
              {visibleSpecLabels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {visibleSpecLabels.map((label) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
                    >
                      <span>{label}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs font-medium text-neutral-500 hover:text-danger"
                        onClick={() => handleHideSpec(label)}
                      >
                        Ta bort
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Inga specifikationer valda. Lägg till en nedan.</p>
              )}
              {hiddenSpecLabels.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {hiddenSpecLabels.map((label) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full px-3 text-xs font-semibold"
                      onClick={() => handleShowSpec(label)}
                    >
                      Lägg till {label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-neutral-700" htmlFor="shared-description">
                Produktbeskrivning
              </label>
              <Textarea
                id="shared-description"
                rows={4}
                value={sharedDescription}
                onChange={(event) => setSharedDescription(event.target.value)}
                placeholder="Beskrivning som gäller för alla artiklar."
              />
            </div>

            <div className="space-y-2">
              <div className="overflow-x-auto">
                <div className="min-w-full space-y-2">
                  <div
                    className="grid items-center gap-3 rounded-2xl bg-neutral-100 p-3 text-xs font-semibold uppercase tracking-wide text-neutral-500"
                    style={{ gridTemplateColumns: articleGridTemplate }}
                  >
                    <span>Artikelnummer</span>
                    <span>Benämning</span>
                    <span>Primärförp.</span>
                    <span>Antal i primärförp.</span>
                    <span className="text-right">Ta bort</span>
                  </div>
                  {products.map((product, index) => {
                    const specMap = new Map<string, string>();
                    product.specs.forEach((spec) => {
                      specMap.set(spec.key.trim(), spec.value);
                    });

                    const primaryPackaging =
                      getSpecValue(specMap, (label) => isPrimaryPackagingTypeLabel(label)) ?? "-";
                    const primaryPackagingQuantity =
                      getSpecValue(
                        specMap,
                        (label) => isPrimaryPackagingQuantityLabel(label),
                      ) ?? "-";

                    return (
                      <div
                        key={product.articleNumber}
                        className="grid items-center gap-3 rounded-2xl border border-neutral-200 bg-white/80 p-3 shadow-sm"
                        style={{ gridTemplateColumns: articleGridTemplate }}
                      >
                        <div className="text-sm font-semibold text-neutral-900">{product.articleNumber}</div>
                        <Input
                          id={`title-${product.articleNumber}`}
                          value={product.title}
                          onChange={(event) => updateProductField(index, "title", event.target.value)}
                          placeholder="Benämning"
                        />
                        <div className="text-sm text-neutral-700">{primaryPackaging}</div>
                        <div className="text-sm text-neutral-700">{primaryPackagingQuantity}</div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveProduct(index)}
                          >
                            Ta bort
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
