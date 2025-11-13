"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type ProductData,
  fetchCombinedProductData,
  generateCombinedProductSheet,
  normalizeArticleNumbers,
} from "@/lib/produktblad/combined-product-sheet";

type FetchState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

type PdfState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
};

export default function CombinedProductSheetClientPage() {
  const searchParams = useSearchParams();
  const artiklarParam = searchParams.get("artiklar");
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

  const fetchProductsForNumbers = useCallback(async (numbers: string[]) => {
    if (numbers.length === 0) {
      setFetchState({ status: "error", message: "Ange minst ett artikelnummer." });
      setProducts([]);
      return;
    }

    setFetchState({ status: "loading", message: "Hämtar artiklar..." });

    try {
      const { products: fetchedProducts, errors } = await fetchCombinedProductData(numbers);

      if (fetchedProducts.length === 0) {
        const errorMessage =
          errors.length > 0
            ? errors
                .map((entry) => `Artikel ${entry.articleNumber}: ${entry.message}`)
                .join("\n")
            : "Inga artiklar kunde hämtas.";
        setFetchState({ status: "error", message: errorMessage });
        setProducts([]);
        return;
      }

      setProducts(fetchedProducts);

      if (errors.length > 0) {
        const errorMessage = errors
          .map((entry) => `Artikel ${entry.articleNumber}: ${entry.message}`)
          .join("\n");
        setFetchState({
          status: "error",
          message: `Kunde inte hämta vissa artiklar:\n${errorMessage}`,
        });
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
      await generateCombinedProductSheet(products);
      setPdfState({ status: "success", message: "PDF genererad." });
    } catch (error) {
      console.error(error);
      setPdfState({ status: "error", message: "Kunde inte generera PDF." });
    }
  };

  return (
    <div className="space-y-10">
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

          <div className="grid grid-cols-1 gap-4">
            {products.map((product, index) => (
              <article
                key={product.articleNumber}
                className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white/80 p-6 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">Artikelnummer</p>
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
                  <label
                    className="text-sm font-medium text-neutral-700"
                    htmlFor={`description-${product.articleNumber}`}
                  >
                    Beskrivning
                  </label>
                  <Textarea
                    id={`description-${product.articleNumber}`}
                    rows={4}
                    value={product.description}
                    onChange={(event) => updateProductField(index, "description", event.target.value)}
                  />
                </div>

                {product.specs.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                      Specifikationer
                    </h3>
                    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {product.specs.map((spec, specIndex) => (
                        <div
                          key={`${product.articleNumber}-${specIndex}`}
                          className="rounded-xl border border-neutral-200 bg-white/60 p-3"
                        >
                          <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                            {spec.key}
                          </dt>
                          <dd className="text-sm text-neutral-700">{spec.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
