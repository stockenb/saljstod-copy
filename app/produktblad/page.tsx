"use client";

import { ChangeEvent, KeyboardEvent, useMemo, useState } from "react";
import type { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
};

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
};

const contactDetails = [
  "Nils Ahlgren AB • Rörvägen 16, 136 50 Jordbro",
  "info@nilsahlgren.se • +46 8 500 125 80 • www.nilsahlgren.se",
];

const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;

async function convertImageToDataUrl(source: string): Promise<PdfImage | null> {
  if (!source) {
    return null;
  }

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

  if (source.startsWith("data:image/")) {
    return parseDataUrl(source);
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

  const fetchAndConvert = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const blob = await response.blob();
      return await blobToPdfImage(blob);
    } catch (error) {
      console.warn("Kunde inte läsa in bilden", error);
      return null;
    }
  };

  if (REMOTE_IMAGE_PATTERN.test(source) || source.startsWith("//")) {
    const resolvedSource = source.startsWith("//")
      ? `${typeof window !== "undefined" ? window.location.protocol : "https:"}${source}`
      : source;
    try {
      const proxyUrl = `/api/produktblad/image?src=${encodeURIComponent(resolvedSource)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        return null;
      }

      const data = (await response.json().catch(() => null)) as
        | { dataUrl?: string }
        | null;

      if (!data?.dataUrl) {
        return null;
      }

      return parseDataUrl(data.dataUrl);
    } catch (error) {
      console.error("Kunde inte proxy-ladda bilden", error);
      return null;
    }
  }

  return await fetchAndConvert(source);
}

let logoCache: PdfImage | null | undefined;

async function loadLogoImage() {
  if (typeof logoCache !== "undefined") {
    return logoCache;
  }

  logoCache = await convertImageToDataUrl(LOGO_IMAGE_PATH);
  return logoCache;
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
    const [regular, semiBold] = await Promise.all([
      loadFontBase64("regular"),
      loadFontBase64("semiBold"),
    ]);

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

export default function ProduktbladPage() {
  const [lookupId, setLookupId] = useState("");
  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle", message: "" });
  const [pdfState, setPdfState] = useState<PdfState>({ status: "idle", message: "" });

  const hasSpecs = form.specs.length > 0;

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

  const handleLookup = async () => {
    if (!lookupId.trim()) {
      setFetchState({ status: "error", message: "Ange ett artikelnummer att söka på." });
      return;
    }

    setFetchState({ status: "loading", message: "Hämtar artikelinformation..." });

    try {
      const response = await fetch(`/api/produktblad?id=${encodeURIComponent(lookupId.trim())}`);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setFetchState({
          status: "error",
          message: body?.error ?? "Kunde inte hitta artikel i flödet.",
        });
        return;
      }

      const data = (await response.json()) as {
        product: ProductFormData;
      };

      setForm({
        articleNumber: data.product.articleNumber ?? lookupId.trim(),
        title: data.product.title ?? "",
        link: data.product.link ?? "",
        image: data.product.image ?? "",
        description: data.product.description ?? "",
        weight: data.product.weight ?? "",
        specs: Array.isArray(data.product.specs) ? data.product.specs : [],
      });
      setLookupId(data.product.articleNumber ?? lookupId.trim());
      setPdfState({ status: "idle", message: "" });
      setFetchState({ status: "success", message: "Artikelinformation hämtad." });
    } catch (error) {
      console.error("Kunde inte hämta produkt", error);
      setFetchState({
        status: "error",
        message: "Kunde inte hämta data just nu. Försök igen senare.",
      });
    }
  };

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

  const handleGeneratePdf = async () => {
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
      
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(marginX, headerTop, contentWidth, 26, 4, 4, "F");
      doc.setFont(baseFont, boldStyle);
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(form.title || "Produktblad", marginX + 8, headerTop + 12);

      if (form.articleNumber) {
        doc.setFont(baseFont, normalStyle);
        doc.setFontSize(11);
        doc.setTextColor(226, 232, 240);
        doc.text(`Artikelnummer: ${form.articleNumber}`, marginX + 8, headerTop + 20);
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
          const imageProps = doc.getImageProperties(image.dataUrl);
          const maxImageWidth = 70;
          const maxImageHeight = 70;
          let imageWidth = maxImageWidth;
          let imageHeight = (imageProps.height / imageProps.width) * imageWidth;

          if (imageHeight > maxImageHeight) {
            imageHeight = maxImageHeight;
            imageWidth = (imageProps.width / imageProps.height) * imageHeight;
          }

          const imageX = marginX + contentWidth - imageWidth;
          const imageY = currentY;
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(imageX - 1, imageY - 1, imageWidth + 2, imageHeight + 2, 3, 3);
          doc.addImage(image.dataUrl, image.format, imageX, imageY, imageWidth, imageHeight);

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

      let buttonLayout: { x: number; y: number; width: number; height: number; bottom: number } | null =
        null;


      if (form.link) {
        const buttonLabel = "Öppna produktsidan";
        doc.setFont(baseFont, boldStyle);
        const labelWidth =
          doc.getStringUnitWidth(buttonLabel) * (doc.getFontSize() / doc.internal.scaleFactor);
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
        doc.text(
          buttonLabel,
          buttonLayout.x + paddingX,
          buttonLayout.y + buttonHeight - paddingY - 1
        );
doc.link(buttonLayout.x, buttonLayout.y, buttonLayout.width, buttonLayout.height, {
          url: form.link,
        });

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
        descriptionStartY = currentY;      }

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
          const normalizedParagraph = paragraph.replace(/\r?\n/g, " ").trim();

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

            const maxWidth =
              imageLayout && textBaseline < columnLimitY ? columnWidth : contentWidth;
            const lineWidth =
              doc.getStringUnitWidth(line) * (doc.getFontSize() / doc.internal.scaleFactor);

            if (lineWidth > maxWidth) {
              const forcedLines = doc.splitTextToSize(line, maxWidth);
              for (const forcedLine of forcedLines) {
                doc.text(forcedLine, marginX, textBaseline);
                lastLineBaseline = textBaseline;
                textBaseline += lineHeight;
              }
            } else {
              doc.text(line, marginX, textBaseline);
              lastLineBaseline = textBaseline;
              textBaseline += lineHeight;
            }
          };

          for (const word of words) {
            const maxWidth =
              imageLayout && textBaseline < columnLimitY ? columnWidth : contentWidth;
            const candidate = currentLine ? `${currentLine} ${word}` : word;
            const candidateWidth =
              doc.getStringUnitWidth(candidate) * (doc.getFontSize() / doc.internal.scaleFactor);

            if (candidateWidth <= maxWidth) {
              currentLine = candidate;
            } else {
              writeLine(currentLine);
              currentLine = "";

              const updatedMaxWidth =
                imageLayout && textBaseline < columnLimitY ? columnWidth : contentWidth;
              const wordWidth =
                doc.getStringUnitWidth(word) * (doc.getFontSize() / doc.internal.scaleFactor);

              if (wordWidth > updatedMaxWidth) {
                const forcedLines = doc.splitTextToSize(word, updatedMaxWidth);
                for (const forcedLine of forcedLines) {
                  doc.text(forcedLine, marginX, textBaseline);
                  lastLineBaseline = textBaseline;
                  textBaseline += lineHeight;
                }
              } else {
                currentLine = word;
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
        .map((spec) => [spec.key.trim() || "Specifikation", spec.value.trim()]);

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
            fillColor: [15, 23, 42],
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
      contactDetails.forEach((line, index) => {
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
    <div className="space-y-10">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Skapa produktblad</h1>
        <p className="text-sm text-neutral-600">
          Hämta artikelinformation från produktflödet, justera innehållet och spara ett färdigt
          produktblad som PDF.
        </p>
      </div>

      <section className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Hämta från artikelnummer</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Ange artikelnumret för att fylla i produktbladet automatiskt. Du kan justera alla fält
          efteråt.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              value={lookupId}
              onChange={(event) => setLookupId(event.target.value)}
              placeholder="Till exempel 12345"
              aria-label="Artikelnummer att hämta"
            />
          </div>
          <Button onClick={() => void handleLookup()} disabled={fetchState.status === "loading"}>
            {fetchState.status === "loading" ? "Hämtar..." : "Hämta uppgifter"}
          </Button>
        </div>
        {fetchState.message ? (
          <p className={`${fetchMessageStyles} mt-2`}>{fetchState.message}</p>
        ) : null}
      </section>

      <section className="space-y-8 rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">Artikelnummer</label>
              <Input
                className="mt-1"
                value={form.articleNumber}
                onChange={(event) => {
                  handleFormChange("articleNumber", event.target.value);
                  setLookupId(event.target.value);
                }}
                placeholder="Fyll i artikelnummer"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Benämning</label>
              <Input
                className="mt-1"
                value={form.title}
                onChange={(event) => handleFormChange("title", event.target.value)}
                placeholder="Skriv benämning"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Länk till webbshop</label>
              <Input
                className="mt-1"
                value={form.link}
                onChange={(event) => handleFormChange("link", event.target.value)}
                placeholder="https://"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Vikt</label>
              <Input
                className="mt-1"
                value={form.weight}
                onChange={(event) => handleFormChange("weight", event.target.value)}
                placeholder="Till exempel 3 kg"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">Bildadress</label>
              <Input
                className="mt-1"
                value={form.image}
                onChange={(event) => handleFormChange("image", event.target.value)}
                placeholder="Klistra in bild-URL eller ladda upp nedan"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Om bilden saknas eller är felaktig kan du ange en ny webbadress eller ladda upp en
                ersättningsbild.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Ladda upp ny bild</label>
              <input
                className="mt-1 block w-full rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-4 py-3 text-sm text-neutral-700 focus:border-primary focus:outline-none"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Förhandsgranskning</label>
              <div className="mt-1 flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="Produktbild" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm text-neutral-400">Ingen bild vald ännu</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-neutral-700">Beskrivning</label>
          <Textarea
            className="mt-2"
            value={form.description}
            onChange={(event) => handleFormChange("description", event.target.value)}
            placeholder="Skriv eller klistra in produktbeskrivningen här"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">Specifikationer</h3>
            <Button variant="outline" size="sm" onClick={handleAddSpec}>
              Lägg till specifikation
            </Button>
          </div>
          {hasSpecs ? (
            <div className="space-y-4">
              {form.specs.map((spec, index) => (
                <div
                  key={`spec-${index}`}
                  className="grid gap-3 rounded-2xl border border-neutral-200 bg-white/70 p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]"
                >
                  <Input
                    value={spec.key}
                    onChange={(event) => handleSpecChange(index, "key", event.target.value)}
                    onKeyDown={(event) => handleSpecKeyDown(event, index)}
                    placeholder="Specifikation"
                    aria-label={`Specifikation ${index + 1}`}
                  />
                  <Input
                    value={spec.value}
                    onChange={(event) => handleSpecChange(index, "value", event.target.value)}
                    onKeyDown={(event) => handleSpecKeyDown(event, index)}
                    placeholder="Värde"
                    aria-label={`Värde för specifikation ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-self-end text-danger"
                    onClick={() => handleRemoveSpec(index)}
                  >
                    Ta bort
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-neutral-200 bg-white/50 p-4 text-sm text-neutral-500">
              Inga specifikationer ännu. Lägg till de egenskaper du vill visa i produktbladet.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {pdfState.message ? <p className={pdfMessageStyles}>{pdfState.message}</p> : <span />}
          <Button
            onClick={() => void handleGeneratePdf()}
            disabled={pdfState.status === "loading"}
            className="self-end"
          >
            {pdfState.status === "loading" ? "Skapar PDF..." : "Spara produktblad som PDF"}
          </Button>
        </div>
      </section>
    </div>
  );
}
