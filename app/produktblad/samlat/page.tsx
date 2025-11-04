"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

const MAX_DESCRIPTION_LINES = 8;

function normalizeArticleNumbers(raw: string): string[] {
  return raw
    .split(/[\n,;\t ]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function CombinedProductSheetPage() {
  const [articleInput, setArticleInput] = useState("");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "idle", message: "" });
  const [pdfState, setPdfState] = useState<PdfState>({ status: "idle", message: "" });

  const hasProducts = products.length > 0;

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

  const handleFetchProducts = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numbers = Array.from(new Set(normalizeArticleNumbers(articleInput)));

    if (numbers.length === 0) {
      setFetchState({ status: "error", message: "Ange minst ett artikelnummer." });
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

      if (errors.length > 0) {
        setFetchState({ status: "error", message: `Kunde inte hämta vissa artiklar:\n${errors.join("\n")}` });
      } else {
        setFetchState({ status: "success", message: "Alla artiklar har hämtats." });
      }
    } catch (error) {
      console.error(error);
      setFetchState({ status: "error", message: "Ett oväntat fel inträffade." });
    }
  };

  const updateProductField = (index: number, field: keyof ProductData, value: string) => {
    setProducts((previous) => {
      const next = [...previous];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveProduct = (index: number) => {
    setProducts((previous) => previous.filter((_, productIndex) => productIndex !== index));
  };

  const handleGeneratePdf = async () => {
    if (products.length === 0) {
      setPdfState({ status: "error", message: "Lägg till minst en artikel innan du skapar PDF." });
      return;
    }

    setPdfState({ status: "loading", message: "Genererar PDF..." });

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 20;
      const marginY = 20;
      const contentWidth = pageWidth - marginX * 2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(30, 41, 59);
      doc.text("Samlat produktblad", marginX, marginY);

      let currentY = marginY + 10;

      products.forEach((product, index) => {
        if (currentY > pageHeight - marginY - 40) {
          doc.addPage();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(20);
          doc.setTextColor(30, 41, 59);
          doc.text("Samlat produktblad", marginX, marginY);
          currentY = marginY + 10;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(product.title || "Produkt", marginX, currentY);
        currentY += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const articleLine = [`Artikelnummer: ${product.articleNumber}`];
        if (product.weight) {
          articleLine.push(`Vikt: ${product.weight}`);
        }
        doc.text(articleLine.join("  •  "), marginX, currentY);
        currentY += 6;

        if (product.description) {
          doc.setFontSize(10);
          const descriptionLines = doc.splitTextToSize(product.description, contentWidth);
          const limitedDescription = descriptionLines.slice(0, MAX_DESCRIPTION_LINES);
          doc.text(limitedDescription, marginX, currentY);
          currentY += limitedDescription.length * 5 + 2;
        }

        if (product.specs.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text("Specifikationer", marginX, currentY);
          currentY += 5;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);

          product.specs.slice(0, 10).forEach((spec) => {
            if (currentY > pageHeight - marginY - 30) {
              doc.addPage();
              doc.setFont("helvetica", "bold");
              doc.setFontSize(20);
              doc.setTextColor(30, 41, 59);
              doc.text("Samlat produktblad", marginX, marginY);
              currentY = marginY + 10;

              doc.setFontSize(14);
              doc.text(product.title || "Produkt", marginX, currentY);
              currentY += 6;

              doc.setFont("helvetica", "normal");
              doc.setFontSize(11);
              doc.text(articleLine.join("  •  "), marginX, currentY);
              currentY += 6;

              doc.setFont("helvetica", "bold");
              doc.setFontSize(11);
              doc.text("Specifikationer", marginX, currentY);
              currentY += 5;
              doc.setFont("helvetica", "normal");
              doc.setFontSize(10);
            }

            const line = `${spec.key}: ${spec.value}`;
            const specLines = doc.splitTextToSize(line, contentWidth - 6);
            doc.text(specLines, marginX + 3, currentY);
            currentY += specLines.length * 4;
          });
        }

        if (index < products.length - 1) {
          currentY += 4;
          doc.setDrawColor(226, 232, 240);
          doc.line(marginX, currentY, marginX + contentWidth, currentY);
          currentY += 6;
        }
      });

      const lastPage = doc.getNumberOfPages();
      doc.setPage(lastPage);
      const footerY = doc.internal.pageSize.getHeight() - marginY + 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      contactDetails.forEach((line, index) => {
        doc.text(line, marginX, footerY + index * 4);
      });

      doc.save("samlat-produktblad.pdf");
      setPdfState({ status: "success", message: "PDF genererad." });
    } catch (error) {
      console.error(error);
      setPdfState({ status: "error", message: "Kunde inte generera PDF." });
    }
  };

  return (
    <main className="min-h-screen w-full bg-neutral-50">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-16">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Skapa samlat produktblad
          </h1>
          <p className="text-sm text-neutral-600">
            Ange flera artikelnummer för att skapa ett samlat produktblad för en hel produktfamilj.
          </p>
        </header>

        <form onSubmit={handleFetchProducts} className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <label htmlFor="article-input" className="text-sm font-medium text-neutral-700">
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button type="submit" className="w-full sm:w-auto">
              Hämta artiklar
            </Button>
            {fetchState.message && <span className={fetchMessageStyles}>{fetchState.message}</span>}
          </div>
        </form>

        {hasProducts && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-neutral-900">Artiklar</h2>
              <Button type="button" onClick={handleGeneratePdf} variant="secondary">
                Skapa samlat produktblad
              </Button>
            </div>
            {pdfState.message && <span className={pdfMessageStyles}>{pdfState.message}</span>}
            <div className="grid grid-cols-1 gap-4">
              {products.map((product, index) => (
                <article key={product.articleNumber} className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Artikelnummer
                      </p>
                      <p className="text-base font-semibold text-neutral-900">{product.articleNumber}</p>
                    </div>
                    <Button type="button" variant="ghost" onClick={() => handleRemoveProduct(index)}>
                      Ta bort
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-neutral-700" htmlFor={`title-${product.articleNumber}`}>
                        Titel
                      </label>
                      <Input
                        id={`title-${product.articleNumber}`}
                        value={product.title}
                        onChange={(event) => updateProductField(index, "title", event.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-neutral-700" htmlFor={`weight-${product.articleNumber}`}>
                        Vikt
                      </label>
                      <Input
                        id={`weight-${product.articleNumber}`}
                        value={product.weight}
                        onChange={(event) => updateProductField(index, "weight", event.target.value)}
                        placeholder="Exempel: 1,2 kg"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-700" htmlFor={`description-${product.articleNumber}`}>
                      Beskrivning
                    </label>
                    <Textarea
                      id={`description-${product.articleNumber}`}
                      rows={4}
                      value={product.description}
                      onChange={(event) => updateProductField(index, "description", event.target.value)}
                    />
                  </div>

                  {product.specs.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                        Specifikationer
                      </h3>
                      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {product.specs.map((spec, specIndex) => (
                          <div key={`${product.articleNumber}-${specIndex}`} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                              {spec.key}
                            </dt>
                            <dd className="text-sm text-neutral-700">{spec.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
