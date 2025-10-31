"use client";

import { ChangeEvent, useMemo, useState } from "react";
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
  "Nils Ahlgren AB • Västberga Allé 61, 126 30 Hägersten",
  "info@nilsahlgren.se • +46 8 19 25 00 • www.nilsahlgren.se",
];

async function convertImageToDataUrl(source: string): Promise<PdfImage | null> {
  if (!source) {
    return null;
  }

  if (source.startsWith("data:image/")) {
    const formatMatch = source.match(/^data:image\/(png|jpe?g|webp)/i);
    const format = (formatMatch?.[1] ?? "png").toLowerCase();
    if (format === "jpg" || format === "jpeg") {
      return { dataUrl: source, format: "JPEG" };
    }
    if (format === "webp") {
      return { dataUrl: source, format: "WEBP" };
    }
    return { dataUrl: source, format: "PNG" };
  }

  try {
    const response = await fetch(source);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    return await new Promise<PdfImage | null>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          resolve(null);
          return;
        }

        const formatMatch = result.match(/^data:image\/(png|jpe?g|webp)/i);
        const format = (formatMatch?.[1] ?? "png").toLowerCase();
        if (format === "jpg" || format === "jpeg") {
          resolve({ dataUrl: result, format: "JPEG" });
          return;
        }
        if (format === "webp") {
          resolve({ dataUrl: result, format: "WEBP" });
          return;
        }
        resolve({ dataUrl: result, format: "PNG" });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Kunde inte läsa in bilden", error);
    return null;
  }
}

function createFilename(form: ProductFormData) {
  const base = form.title || form.articleNumber || "produktblad";
  return `${base}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .concat(".pdf");
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
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableModule.default;

      const doc = new jsPDF();

      const image = await convertImageToDataUrl(form.image);
      if (image) {
        try {
          doc.addImage(image.dataUrl, image.format, 140, 20, 50, 50);
        } catch (imageError) {
          console.warn("Kunde inte lägga till bild i PDF", imageError);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(form.title || "Produktblad", 14, 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      let currentY = 34;

      if (form.articleNumber) {
        doc.text(`Artikelnummer: ${form.articleNumber}`, 14, currentY);
        currentY += 6;
      }

      if (form.weight) {
        doc.text(`Vikt: ${form.weight}`, 14, currentY);
        currentY += 6;
      }

      if (form.link) {
        doc.setTextColor(37, 99, 235);
        doc.textWithLink(form.link, 14, currentY, { url: form.link });
        doc.setTextColor(0, 0, 0);
        currentY += 8;
      }

      if (form.description) {
        doc.setFontSize(12);
        doc.text("Beskrivning:", 14, currentY);
        currentY += 6;
        doc.setFontSize(11);
        const descriptionLines = doc.splitTextToSize(form.description, 180);
        doc.text(descriptionLines, 14, currentY);
        currentY += descriptionLines.length * 5 + 4;
      }

      if (form.specs.length > 0) {
        const body = form.specs
          .filter((spec) => spec.key.trim() || spec.value.trim())
          .map((spec) => [spec.key.trim(), spec.value.trim()]);

        if (body.length > 0) {
          autoTable(doc, {
            startY: currentY,
            head: [["Specifikation", "Värde"]],
            body,
            styles: {
              font: "helvetica",
              fontSize: 10,
              cellPadding: 3,
            },
            headStyles: {
              fillColor: [17, 24, 39],
              textColor: [255, 255, 255],
            },
            alternateRowStyles: {
              fillColor: [243, 244, 246],
            },
          });

          const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
          if (finalY) {
            currentY = finalY + 8;
          }
        }
      }

      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      contactDetails.forEach((line, index) => {
        doc.text(line, 14, pageHeight - 16 + index * 6);
      });

      doc.save(createFilename(form));

      setPdfState({ status: "success", message: "PDF sparad." });
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
                    placeholder="Specifikation"
                    aria-label={`Specifikation ${index + 1}`}
                  />
                  <Input
                    value={spec.value}
                    onChange={(event) => handleSpecChange(index, "value", event.target.value)}
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
