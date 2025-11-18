"use client";

import { useEffect, useMemo, useState } from "react";
import type { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProductSpecification = { key: string; value: string };

type Product = {
  articleNumber: string;
  title: string;
  link: string;
  image: string;
  description: string;
  weight: string;
  specs: ProductSpecification[];
  primaryPackaging: string | null;
};

type CatalogProduct = Product & { variants: Product[] };

type ProductCategory = {
  id: string;
  name: string;
  parentId?: string;
  children: ProductCategory[];
  productSkus: string[];
};

interface AppendixSection {
  id: string;
  title: string;
  description?: string;
}

const DEFAULT_ROOT_CATEGORY = "46";
const KONCERN_SECTION_ID = "koncerninformation";

const appendixSections: AppendixSection[] = [
  {
    id: KONCERN_SECTION_ID,
    title: "Information om koncernen",
    description: "Presentation om koncernen.",
  },
  {
    id: "reklam-stangsel",
    title: "Stängsel-reklam",
    description: "Inkludera blänkare om stängsel.",
  },
  {
    id: "historia",
    title: "Ahlgrens historia",
    description: "Information om Nils Ahlgren AB historia.",
  },
  {
    id: "smapack",
    title: "Småpack",
    description: "Inkludera bilder och informatiom om SB-pack",
  },
  {
    id: "miljo",
    title: "Kvalitet och miljö",
    description: "Sida om vårt miljöfokus.",
  },
  {
    id: "packstugan",
    title: "Packstugan",
    description: "Information om packstugan",
  },
];

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

type SelectionState = Record<string, boolean>;

type PdfState =
  | { status: "idle" }
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const koncernIntro =
  "Nils Ahlgren AB är ett helägt dotterbolag till Skyllbergs Bruks AB. Bilden visar koncernens huvudkontor i Skyllberg.";

const koncernCompanies = [
  {
    name: "Skyllbergs Bruks AB",
    description:
      "Koncernens moderbolag Skyllbergs Bruks AB i södra Närke är kanske landets äldsta företag med svenskt ägande. Företaget har bearbetat järn sedan 1346.",
    website: "www.skyllbergsbruk.se",
  },
  {
    name: "Skyllberg Industri AB",
    description:
      "Skyllberg Industri är dotterbolag till Skyllbergs Bruks AB med lång lokal tradition av tråddragning, spiktillverkning och tillverkning av svetsade stålkonstruktioner. Industrin ligger i orten Kårberg, tre kilometer från Skyllberg.",
    website: "www.skyllbergindustri.se",
  },
  {
    name: "Defab",
    description:
      "Degerfors Förzinknings AB är dotterbolag till Skyllbergs Bruks AB sedan 1996 och en av landets största legovarmförzinkare av styckegods samt spik och annat smågods. Här finns en filial till Nils Ahlgren för försäljning av stängsel och områdesskydd.",
    website: "www.defab.net",
  },
  {
    name: "Nils Ahlgren AB",
    description:
      "Dotterbolag till Skyllbergs Bruks AB sedan 1982. Nils Ahlgren är grossist till bygg- och järnvaruhandeln samt heltäckande leverantör av områdesskydd.",
    website: "www.nilsahlgren.se",
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.trim().replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const value = parseInt(expanded, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function createSelectionFromCategories(
  categories: ProductCategory[],
  defaultValue = false,
): SelectionState {
  const selection: SelectionState = {};
  const visit = (category: ProductCategory) => {
    selection[category.id] = defaultValue;
    category.children.forEach(visit);
  };
  categories.forEach(visit);
  return selection;
}

function collectCategoryIds(categories: ProductCategory[]): string[] {
  const ids: string[] = [];
  const visit = (category: ProductCategory) => {
    ids.push(category.id);
    category.children.forEach(visit);
  };
  categories.forEach(visit);
  return ids;
}

function createAppendixSelection(sections: AppendixSection[]): SelectionState {
  return sections.reduce<SelectionState>((acc, section) => {
    acc[section.id] = false;
    return acc;
  }, {});
}

export default function CatalogGeneratorPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categorySelection, setCategorySelection] = useState<SelectionState>({});
  const [appendixSelection, setAppendixSelection] = useState<SelectionState>(() =>
    createAppendixSelection(appendixSections),
  );
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [pdfState, setPdfState] = useState<PdfState>({ status: "idle" });
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    setIsLoadingCategories(true);
    fetch(`/api/categories?parentId=${DEFAULT_ROOT_CATEGORY}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Kunde inte läsa kategorier");
        }
        return response.json();
      })
      .then((data: { categories?: ProductCategory[] }) => {
        if (isCancelled) return;
        const nextCategories = data.categories ?? [];
        setCategories(nextCategories);
        setCategorySelection(createSelectionFromCategories(nextCategories));
        setCategoryError(null);
      })
      .catch((error) => {
        if (isCancelled) return;
        console.error(error);
        setCategories([]);
        setCategorySelection({});
        setCategoryError(
          "Kunde inte läsa kategorier från produktflödet. Försök igen eller kontakta utvecklaren.",
        );
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingCategories(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const allCategoryIds = useMemo(() => collectCategoryIds(categories), [categories]);

  const selectedCategoryCount = useMemo(
    () => Object.values(categorySelection).filter(Boolean).length,
    [categorySelection],
  );

  const areAllCategoriesSelected = useMemo(() => {
    const values = allCategoryIds.map((id) => categorySelection[id]);
    return values.length > 0 && values.every(Boolean);
  }, [allCategoryIds, categorySelection]);

  const includeAllIndeterminate = useMemo(
    () => selectedCategoryCount > 0 && !areAllCategoriesSelected,
    [areAllCategoriesSelected, selectedCategoryCount],
  );

  const includeAllCheckboxRef = useIndeterminateCheckbox(includeAllIndeterminate);

  const selectedAppendixCount = useMemo(
    () => Object.values(appendixSelection).filter(Boolean).length,
    [appendixSelection],
  );

  const isGenerateDisabled =
    selectedCategoryCount === 0 || pdfState.status === "loading" || isLoadingCategories;

  const isKoncernSelected = appendixSelection[KONCERN_SECTION_ID] ?? false;

  const handleToggleAllCategories = (checked: boolean) => {
    setCategorySelection(() => {
      const next: SelectionState = {};
      allCategoryIds.forEach((id) => {
        next[id] = checked;
      });
      return next;
    });
  };

  function toggleCategory(category: ProductCategory, checked: boolean) {
    setCategorySelection((prev) => {
      const next = { ...prev } as SelectionState;
      const apply = (node: ProductCategory) => {
        next[node.id] = checked;
        node.children.forEach(apply);
      };
      apply(category);
      return next;
    });
  }

  function toggleAppendix(id: string, checked: boolean) {
    setAppendixSelection((prev) => ({
      ...prev,
      [id]: checked,
    }));
  }

  async function handleGeneratePdf() {
    const selectedCategories = Object.entries(categorySelection)
      .filter(([, value]) => value)
      .map(([id]) => id);

    if (selectedCategories.length === 0) {
      setPdfState({ status: "error", message: "Välj minst en kategori först." });
      return;
    }

    setPdfState({ status: "loading", message: "Hämtar artiklar och genererar PDF..." });

    try {
      const response = await fetch("/api/catalog-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryIds: selectedCategories,
          includeDescendants: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Kunde inte läsa produkter.");
      }

      const data = (await response.json()) as { products?: CatalogProduct[] };
      const products = data.products ?? [];
      setCatalogProducts(products);

      await generateCatalogPdf(products, {
        appendices: appendixSections.filter((section) => appendixSelection[section.id]),
        includeKoncern: isKoncernSelected,
      });

      setPdfState({
        status: "success",
        message: "PDF genererad. Kontakta utvecklaren för vidare anpassningar.",
      });
    } catch (error) {
      console.error(error);
      setPdfState({
        status: "error",
        message: "Det gick inte att generera PDF:en. Försök igen.",
      });
    }
  }

  return (
    <div className="space-y-8 mt-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Generera katalog</h1>
        <p className="text-sm text-neutral-600">
          Välj kategorier från produktflödet, inkludera eventuella bilagor och skapa en PDF-katalog med moderartiklar och deras varianter.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6 rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <header className="max-w-xl space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Välj kategorier</h2>
              <p className="text-sm text-neutral-600">
                Kryssa i de kategorier du vill inkludera i din produktkatalog. Underkategorier följer automatiskt med när en överordnad kategori väljs.
              </p>
              {categoryError ? (
                <p className="text-sm text-red-600">{categoryError}</p>
              ) : null}
            </header>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition",
                areAllCategoriesSelected
                  ? "border-sky-300 bg-sky-50 text-sky-800"
                  : "border-neutral-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50",
              )}
            >
              <input
                ref={includeAllCheckboxRef}
                type="checkbox"
                className="h-4 w-4 rounded border-neutral-300 text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                checked={areAllCategoriesSelected}
                onChange={(event) => handleToggleAllCategories(event.target.checked)}
                disabled={isLoadingCategories || !allCategoryIds.length}
              />
              Inkludera allt
            </label>
          </div>

          {isLoadingCategories ? (
            <p className="text-sm text-neutral-600">Laddar kategorier från produktflödet...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-neutral-600">Inga kategorier kunde läsas in.</p>
          ) : (
            <div className="space-y-3">
              <CategoryTree
                categories={categories}
                selection={categorySelection}
                onToggleCategory={toggleCategory}
              />
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Bilagor</h2>
              <p className="text-sm text-neutral-600">
                Lägg till fasta informationssidor som ska bifogas i slutet av katalogen.
              </p>
            </header>
            <div className="space-y-3">
              {appendixSections.map((section) => (
                <label
                  key={section.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                    appendixSelection[section.id]
                      ? "border-sky-300 bg-sky-50"
                      : "border-transparent hover:border-sky-200 hover:bg-sky-50",
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    checked={appendixSelection[section.id] ?? false}
                    onChange={(event) => toggleAppendix(section.id, event.target.checked)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">{section.title}</span>
                    {section.description ? (
                      <span className="mt-1 block text-sm text-neutral-600">{section.description}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-1 rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-6">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Sammanfattning</h2>
            </header>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>
                <strong>{selectedCategoryCount}</strong> valda kategorisektioner
              </li>
              <li>
                <strong>{selectedAppendixCount}</strong> bilagor
              </li>
              <li>
                <strong>{catalogProducts.length}</strong> moderartiklar i senaste genereringen
              </li>
            </ul>
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={isGenerateDisabled}
              variant={isGenerateDisabled ? "secondary" : "default"}
              onClick={handleGeneratePdf}
            >
              {pdfState.status === "loading"
                ? "Genererar PDF..."
                : isGenerateDisabled
                ? "Välj minst en kategori"
                : "Generera PDF"}
            </Button>
            {pdfState.status !== "idle" && (
              <p
                className={cn(
                  "text-sm",
                  pdfState.status === "error" ? "text-red-600" : "text-neutral-600",
                )}
              >
                {pdfState.message}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

interface CategoryTreeProps {
  categories: ProductCategory[];
  selection: SelectionState;
  onToggleCategory: (category: ProductCategory, checked: boolean) => void;
}

function CategoryTree({ categories, selection, onToggleCategory }: CategoryTreeProps) {
  return (
    <ul className="space-y-3">
      {categories.map((category) => (
        <CategoryTreeNode
          key={category.id}
          category={category}
          selection={selection}
          onToggleCategory={onToggleCategory}
        />
      ))}
    </ul>
  );
}

interface CategoryTreeNodeProps {
  category: ProductCategory;
  selection: SelectionState;
  onToggleCategory: (category: ProductCategory, checked: boolean) => void;
}

function CategoryTreeNode({ category, selection, onToggleCategory }: CategoryTreeNodeProps) {
  const descendantIds = useMemo(() => collectCategoryIds([category]), [category]);
  const checkedCount = descendantIds.filter((id) => selection[id]).length;
  const allSelected = checkedCount === descendantIds.length && descendantIds.length > 0;
  const partiallySelected = checkedCount > 0 && checkedCount < descendantIds.length;
  const checkboxRef = useIndeterminateCheckbox(partiallySelected);

  return (
    <li className="rounded-2xl border border-neutral-200/70 bg-white/80 p-4 shadow-sm">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          ref={checkboxRef}
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-neutral-300 text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          checked={allSelected}
          onChange={(event) => onToggleCategory(category, event.target.checked)}
        />
        <span className="space-y-1">
          <span className="block text-base font-semibold text-slate-900">{category.name}</span>
          {category.productSkus.length ? (
            <span className="block text-xs text-neutral-500">
              {category.productSkus.length} moderartiklar i denna nivå
            </span>
          ) : null}
        </span>
      </label>

      {category.children.length ? (
        <div className="mt-3 border-l border-dashed border-neutral-200 pl-4">
          <CategoryTree
            categories={category.children}
            selection={selection}
            onToggleCategory={onToggleCategory}
          />
        </div>
      ) : null}
    </li>
  );
}

interface ImageAsset {
  dataUrl: string;
  width: number;
  height: number;
  format: "PNG" | "JPEG" | "WEBP";
}

async function loadImageAsset(path: string): Promise<ImageAsset> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Kunde inte läsa in bilden: ${path}`);
  }

  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Kunde inte konvertera bilden till data-URL"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Okänt fel vid läsning av bild"));
    reader.readAsDataURL(blob);
  });

  const { width, height } = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const imageElement = document.createElement("img");
      imageElement.onload = () => {
        resolve({
          width: imageElement.naturalWidth,
          height: imageElement.naturalHeight,
        });
      };
      imageElement.onerror = () => reject(new Error("Kunde inte läsa bilddimensioner"));
      imageElement.src = dataUrl;
    },
  );

  let format: ImageAsset["format"] = "JPEG";
  if (blob.type.includes("png")) {
    format = "PNG";
  } else if (blob.type.includes("webp")) {
    format = "WEBP";
  }

  return {
    dataUrl,
    width,
    height,
    format,
  };
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

function useIndeterminateCheckbox(isIndeterminate: boolean) {
  const [element, setElement] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    if (element) {
      element.indeterminate = isIndeterminate;
    }
  }, [element, isIndeterminate]);

  return setElement;
}

function collectVariantSpecLabels(variants: Product[]): string[] {
  const labels: string[] = [];
  variants.forEach((variant) => {
    variant.specs.forEach((spec) => {
      if (spec.key && !labels.includes(spec.key)) {
        labels.push(spec.key);
      }
    });
  });
  return labels.slice(0, 8);
}

function getSpecValue(variant: Product, label: string): string {
  return variant.specs.find((spec) => spec.key === label)?.value ?? "";
}

async function generateCatalogPdf(
  products: CatalogProduct[],
  options: { appendices: AppendixSection[]; includeKoncern: boolean },
) {
  if (products.length === 0) {
    throw new Error("Inga produkter att generera katalogn av.");
  }

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fontsLoaded = await ensurePoppinsFonts(doc);
  const baseFont = fontsLoaded ? "Poppins" : "helvetica";
  const boldStyle: "bold" = "bold";
  const normalStyle: "normal" = "normal";

  const brandBlue = hexToRgb("#023562");
  const slateText: [number, number, number] = [71, 85, 105];
  const slateDark: [number, number, number] = [30, 41, 59];

  const pageMarginX = 18;
  const pageMarginTop = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - pageMarginX * 2;

  for (const [index, product] of products.entries()) {
    if (index > 0) {
      doc.addPage();
    }

    let cursorY = pageMarginTop;
    doc.setFont(baseFont, boldStyle);
    doc.setFontSize(18);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(product.title, pageMarginX, cursorY);
    cursorY += 8;

    doc.setFont(baseFont, normalStyle);
    doc.setFontSize(10);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text(`Artikelnummer: ${product.articleNumber}`, pageMarginX, cursorY);
    cursorY += 6;

    const descriptionWidth = contentWidth * 0.55;
    let imageHeight = 0;

    if (product.image) {
      try {
        const image = await loadImageAsset(product.image);
        const maxImageWidth = contentWidth * 0.4;
        let imageWidth = Math.min(maxImageWidth, image.width / 4);
        imageHeight = (image.height / image.width) * imageWidth;
        if (imageHeight > 90) {
          imageHeight = 90;
          imageWidth = (image.width / image.height) * imageHeight;
        }
        const imageX = pageMarginX + contentWidth - imageWidth;
        const imageY = cursorY;
        doc.addImage(image.dataUrl, image.format, imageX, imageY, imageWidth, imageHeight, undefined, "FAST");
      } catch (error) {
        console.warn("Kunde inte läsa produktbild", error);
      }
    }

    if (product.description) {
      doc.setFont(baseFont, normalStyle);
      doc.setFontSize(11);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      const descriptionLines = doc.splitTextToSize(product.description, descriptionWidth);
      doc.text(descriptionLines, pageMarginX, cursorY);
      cursorY += descriptionLines.length * 5.2 + 6;
    }

    if (imageHeight) {
      cursorY = Math.max(cursorY, pageMarginTop + imageHeight + 6);
    }

    const specLabels = collectVariantSpecLabels(product.variants);
    const tableHead = ["Artikelnummer", "Benämning", "Vikt", ...specLabels];
    const tableBody = product.variants.map((variant) => [
      variant.articleNumber,
      variant.title,
      variant.weight,
      ...specLabels.map((label) => getSpecValue(variant, label)),
    ]);

    if (tableBody.length > 0) {
      autoTable(doc, {
        startY: cursorY,
        margin: { left: pageMarginX, right: pageMarginX },
        head: [tableHead],
        body: tableBody,
        styles: {
          font: baseFont,
          fontStyle: normalStyle,
          fontSize: 9,
          textColor: slateText,
          cellPadding: 2,
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: brandBlue,
          textColor: [255, 255, 255],
          font: baseFont,
          fontStyle: boldStyle,
          fontSize: 9.5,
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
        cursorY = finalY + 10;
      }
    }

    if (cursorY > pageHeight - 30) {
      doc.addPage();
      cursorY = pageMarginTop;
    }

    doc.setFont(baseFont, normalStyle);
    doc.setFontSize(9.5);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text(product.link, pageMarginX, cursorY);
  }

  const otherAppendices = options.appendices.filter((appendix) => appendix.id !== KONCERN_SECTION_ID);

  if (otherAppendices.length) {
    doc.addPage();
    doc.setFont(baseFont, boldStyle);
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("Bilagor", pageMarginX, pageMarginTop);

    doc.setFont(baseFont, normalStyle);
    doc.setFontSize(11);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);

    let cursorY = pageMarginTop + 8;
    otherAppendices.forEach((appendix) => {
      doc.text(`• ${appendix.title}`, pageMarginX, cursorY);
      cursorY += 5;
      if (appendix.description) {
        const lines = doc.splitTextToSize(appendix.description, contentWidth - 8);
        doc.text(lines, pageMarginX + 4, cursorY);
        cursorY += lines.length * 5 + 3;
      }
      cursorY += 2;
      if (cursorY > pageHeight - 30) {
        doc.addPage();
        cursorY = pageMarginTop;
      }
    });
  }

  if (options.includeKoncern) {
    const koncernImage = await loadImageAsset("/koncern.jpg");

    doc.addPage();
    doc.setFillColor(2, 53, 98);
    doc.rect(0, 0, pageWidth, 60, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont(baseFont, normalStyle);
    doc.setFontSize(11);
    doc.text("Bilaga", pageMarginX, 24);

    doc.setFont(baseFont, boldStyle);
    doc.setFontSize(24);
    doc.text("Information om koncernen", pageMarginX, 38);

    doc.setTextColor(30, 41, 59);
    doc.setFont(baseFont, boldStyle);
    doc.setFontSize(14);
    doc.text("Koncernen", pageMarginX, 74);

    doc.setFont(baseFont, normalStyle);
    doc.setFontSize(11);
    const introLines = doc.splitTextToSize(koncernIntro, contentWidth * 0.55);
    doc.text(introLines, pageMarginX, 84);

    const imageMaxWidth = contentWidth * 0.4;
    let imageWidth = imageMaxWidth;
    let imageHeight = (koncernImage.height / koncernImage.width) * imageWidth;

    if (imageHeight > 110) {
      imageHeight = 110;
      imageWidth = (koncernImage.width / koncernImage.height) * imageHeight;
    }
    const imageX = pageMarginX + contentWidth - imageWidth;
    const imageY = 70;

    doc.addImage(
      koncernImage.dataUrl,
      koncernImage.format,
      imageX,
      imageY,
      imageWidth,
      imageHeight,
      undefined,
      "FAST",
    );

    let companyY = imageY + imageHeight + 10;
    if (companyY < 120) {
      companyY = 120;
    }

    koncernCompanies.forEach((company) => {
      if (companyY > pageHeight - 40) {
        doc.addPage();
        companyY = pageMarginTop;
      }

      doc.setFont(baseFont, boldStyle);
      doc.setFontSize(12);
      doc.text(company.name, pageMarginX, companyY);
      companyY += 6;

      doc.setFont(baseFont, normalStyle);
      doc.setFontSize(11);
      const descriptionLines = doc.splitTextToSize(company.description, contentWidth);
      doc.text(descriptionLines, pageMarginX, companyY);
      companyY += descriptionLines.length * 5.5;

      doc.setTextColor(2, 53, 98);
      doc.text(company.website, pageMarginX, companyY);
      doc.setTextColor(15, 23, 42);
      companyY += 7;
    });
  }

  doc.save("nils-ahlgren-katalog.pdf");
}
