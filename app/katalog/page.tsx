"use client";

import { useEffect, useMemo, useState } from "react";
import type { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CatalogSubcategory {
  id: string;
  name: string;
  description?: string;
}

interface CatalogCategory {
  id: string;
  name: string;
  description?: string;
  subcategories?: CatalogSubcategory[];
}

interface AppendixSection {
  id: string;
  title: string;
  description?: string;
}

const placeholderCategories: CatalogCategory[] = [
  {
    id: "skruv",
    name: "Skruv",
    subcategories: [
      {
        id: "skruv-traskruv",
        name: "Träskruv",
      },
      {
        id: "skruv-byggskruv",
        name: "Byggskruv",
      },
      {
        id: "skruv-bandad-skruv",
        name: "Bandad skruv",
      },
    ],
  },
  {
    id: "bult",
    name: "Bult",
    subcategories: [
      {
        id: "bult-brickor",
        name: "Brickor",
      },
      {
        id: "bult-bult-kit",
        name: "Bult-kit",
      },
      {
        id: "bult-gangstanger",
        name: "Gängstänger",
      },
      {
        id: "bult-lyftoglor",
        name: "Lyftöglor",
      },
      {
        id: "bult-mutter",
        name: "Mutter",
      },
      {
        id: "bult-sexkantskruv",
        name: "Sexkantskruv",
      },
      {
        id: "bult-vagnsbult",
        name: "Vagnsbult",
      },
    ],
  },
  {
    id: "infastning",
    name: "Infästning",
    subcategories: [
      {
        id: "infastning-tung-ingfastning",
        name: "Tung ingfästning",
      },
      {
        id: "infastning-lattare-inf",
        name: "Lättare infästning",
      },
      {
        id: "infastning-karminfastning",
        name: "Karminfästning",
      },
      {
        id: "infastning-plugg-spik",
        name: "Plugg & spik",
      },
      {
        id: "infastning-tillbehor",
        name: "Tillbehör infästning",
      },
    ],
  },
  {
    id: "spik",
    name: "Spik",
    subcategories: [
      {
        id: "spik-spik",
        name: "Spik",
      },
      {
        id: "spik-bandad-spik",
        name: "Bandad spik",
      },
    ],
  },
  {
    id: "byggbeslag",
    name: "Byggbeslag",
    subcategories: [
      {
        id: "byggbeslag-balkskor",
        name: "Balkskor",
      },
      {
        id: "byggbeslag-vinkelbeslag",
        name: "Vinkelbeslag",
      },
      {
        id: "byggbeslag-spikplatar",
        name: "Spikplåtar",
      },
      {
        id: "byggbeslag-stolphallare-plintjarn",
        name: "Stolphållare & plintjärn",
      },
      {
        id: "byggbeslag-platband",
        name: "Plåtband",
      },
      {
        id: "byggbeslag-ovriga",
        name: "Övriga byggbeslag",
      },
    ],
  },
  {
    id: "ovrigt-bygg",
    name: "Övrigt bygg",
    subcategories: [
      {
        id: "ovrigt-bygg-hinkar",
        name: "Hinkar",
      },
      {
        id: "ovrigt-bygg-trad",
        name: "Tråd",
      },
      {
        id: "ovrigt-bygg-skottkarror",
        name: "Skottkärror",
      },
      {
        id: "ovrigt-bygg-nat",
        name: "Nät",
      },
      {
        id: "ovrigt-bygg-sprayfarg",
        name: "Sprayfärg",
      },
      {
        id: "ovrigt-bygg-skyddsutrustning",
        name: "Skyddsutrustning",
      },
      {
        id: "ovrigt-bygg-kapskivor-sagblad",
        name: "Kapskivor & sågblad",
      },
      {
        id: "ovrigt-bygg-troskeljarn",
        name: "Tröskeljärn",
      },
    ],
  },
];

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

function createInitialSelection(
  categories: CatalogCategory[],
  defaultValue = false
): SelectionState {
  const initial: SelectionState = {};
  categories.forEach((category) => {
    if (category.subcategories?.length) {
      category.subcategories.forEach((sub) => {
        initial[sub.id] = defaultValue;
      });
    } else {
      initial[category.id] = defaultValue;
    }
  });
  return initial;
}

function createAppendixSelection(sections: AppendixSection[]): SelectionState {
  return sections.reduce<SelectionState>((acc, section) => {
    acc[section.id] = false;
    return acc;
  }, {});
}

export default function CatalogGeneratorPage() {
  const [categorySelection, setCategorySelection] = useState<SelectionState>(
    () => createInitialSelection(placeholderCategories)
  );
  const [appendixSelection, setAppendixSelection] = useState<SelectionState>(
    () => createAppendixSelection(appendixSections)
  );
  const [pdfState, setPdfState] = useState<PdfState>({ status: "idle" });

  const selectedCategoryCount = useMemo(
    () => Object.values(categorySelection).filter(Boolean).length,
    [categorySelection]
  );

  const areAllCategoriesSelected = useMemo(() => {
    const values = Object.values(categorySelection);
    return values.length > 0 && values.every(Boolean);
  }, [categorySelection]);

  const includeAllIndeterminate = useMemo(
    () => selectedCategoryCount > 0 && !areAllCategoriesSelected,
    [areAllCategoriesSelected, selectedCategoryCount]
  );

  const includeAllCheckboxRef = useIndeterminateCheckbox(
    includeAllIndeterminate
  );

  const selectedAppendixCount = useMemo(
    () => Object.values(appendixSelection).filter(Boolean).length,
    [appendixSelection]
  );

  const isGenerateDisabled =
    selectedCategoryCount === 0 || pdfState.status === "loading";

  const isKoncernSelected = appendixSelection[KONCERN_SECTION_ID] ?? false;

  const handleToggleAllCategories = (checked: boolean) => {
    setCategorySelection(() =>
      createInitialSelection(placeholderCategories, checked)
    );
  };

  function toggleCategoryGroup(category: CatalogCategory, checked: boolean) {
    setCategorySelection((prev) => {
      const next = { ...prev };
      if (category.subcategories?.length) {
        category.subcategories.forEach((sub) => {
          next[sub.id] = checked;
        });
      } else {
        next[category.id] = checked;
      }
      return next;
    });
  }

  function toggleSubcategory(id: string, checked: boolean) {
    setCategorySelection((prev) => ({
      ...prev,
      [id]: checked,
    }));
  }

  function toggleAppendix(id: string, checked: boolean) {
    setAppendixSelection((prev) => ({
      ...prev,
      [id]: checked,
    }));
  }

  async function handleGeneratePdf() {
    setPdfState({ status: "loading", message: "Genererar PDF..." });

    try {
      const [{ jsPDF }] = await Promise.all([import("jspdf")]);

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const fontsLoaded = await ensurePoppinsFonts(doc);
      const baseFont = fontsLoaded ? "Poppins" : "helvetica";
      const boldStyle: "bold" = "bold";
      const normalStyle: "normal" = "normal";

      const brandBlue = hexToRgb("#023562");
      const accentColor: [number, number, number] = [255, 83, 10];
      const slateDark: [number, number, number] = [30, 41, 59];
      const slateText: [number, number, number] = [71, 85, 105];

      const pageMarginX = 18;
      const pageMarginTop = 22;
      const pageMarginBottom = 16;
      const lineHeight = 5.5;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const contentWidth = pageWidth - pageMarginX * 2;
      let cursorY = pageMarginTop;

      const ensureSpace = (requiredSpace: number) => {
        if (cursorY + requiredSpace > pageHeight - pageMarginBottom) {
          doc.addPage();
          cursorY = pageMarginTop;
        }
      };

      const categoryBlocks = placeholderCategories
        .map((category) => {
          const subcategories = category.subcategories ?? [];
          const selectedSubcategories = subcategories.filter(
            (subcategory) => categorySelection[subcategory.id]
          );
          const includeWholeCategory =
            !subcategories.length && categorySelection[category.id];

          if (!includeWholeCategory && selectedSubcategories.length === 0) {
            return null;
          }

          return { category, selectedSubcategories, includeWholeCategory };
        })
        .filter(
          (
            block
          ): block is {
            category: CatalogCategory;
            selectedSubcategories: CatalogSubcategory[];
            includeWholeCategory: boolean;
          } => block !== null
        );

      const selectedAppendices = appendixSections.filter(
        (section) => appendixSelection[section.id]
      );

      const [brandR, brandG, brandB] = brandBlue;
      const headerHeight = 30;

      doc.setFillColor(brandR, brandG, brandB);
      doc.roundedRect(pageMarginX, cursorY, contentWidth, headerHeight, 5, 5, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont(baseFont, boldStyle);
      doc.setFontSize(19);
      doc.text("Produktkatalog", pageMarginX + 10, cursorY + 12);

      doc.setFont(baseFont, normalStyle);
      doc.setFontSize(10.5);
      doc.setTextColor(226, 232, 240);
      doc.text(
        `Genererad ${new Date().toLocaleDateString("sv-SE")}`,
        pageMarginX + 10,
        cursorY + 20
      );

      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.6);
      doc.line(
        pageMarginX + 10,
        cursorY + headerHeight - 5,
        pageMarginX + 56,
        cursorY + headerHeight - 5
      );

      cursorY += headerHeight + 8;

      doc.setTextColor(slateText[0], slateText[1], slateText[2]);
      doc.setFont(baseFont, normalStyle);
      doc.setFontSize(11);
      const introLines = doc.splitTextToSize(
        "Detta är en planerad struktur för katalogen. När XML-filen kopplas in hämtas innehåll och sidlayout automatiskt.",
        contentWidth
      );
      doc.text(introLines, pageMarginX, cursorY);
      cursorY += introLines.length * lineHeight + 4;

      if (categoryBlocks.length) {
        doc.setFont(baseFont, boldStyle);
        doc.setFontSize(13.5);
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.text("Kategorier & avsnitt", pageMarginX, cursorY);
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(0.6);
        doc.line(pageMarginX, cursorY + 2, pageMarginX + 44, cursorY + 2);

        cursorY += 8;
      }

      const accentBarWidth = 2.5;

      categoryBlocks.forEach((block) => {
        const blockHeight = estimateCategoryBlockHeight(doc, {
          baseFont,
          boldStyle,
          normalStyle,
          category: block.category,
          selectedSubcategories: block.selectedSubcategories,
          includeWholeCategory: block.includeWholeCategory,
          contentWidth,
          lineHeight,
          accentBarWidth,
        });

        ensureSpace(blockHeight + 8);

        const blockTop = cursorY;
        const paddingTop = 6;
        const textX = pageMarginX + accentBarWidth + 5.5;

        doc.setFillColor(247, 250, 252);
        doc.roundedRect(pageMarginX, blockTop, contentWidth, blockHeight, 5, 5, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(pageMarginX, blockTop, contentWidth, blockHeight, 5, 5, "S");

        doc.setFillColor(brandR, brandG, brandB);
        doc.rect(pageMarginX, blockTop, accentBarWidth, blockHeight, "F");

        let textY = blockTop + paddingTop;

        doc.setFont(baseFont, boldStyle);
        doc.setFontSize(12.5);
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.text(block.category.name, textX, textY);
        textY += 5.5;

        doc.setFont(baseFont, normalStyle);
        doc.setFontSize(10.5);
        doc.setTextColor(slateText[0], slateText[1], slateText[2]);

        if (block.category.description) {
          const descriptionLines = doc.splitTextToSize(
            block.category.description,
            contentWidth - accentBarWidth - 12
          );
          doc.text(descriptionLines, textX, textY);
          textY += descriptionLines.length * lineHeight + 2;
        }

        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

        if (block.includeWholeCategory) {
          doc.text("• Komplett kategori", textX, textY);
          textY += lineHeight + 1.5;
        }

        block.selectedSubcategories.forEach((subcategory) => {
          doc.text(`• ${subcategory.name}`, textX, textY);
          textY += lineHeight;

          if (subcategory.description) {
            doc.setFont(baseFont, normalStyle);
            doc.setFontSize(10);
            doc.setTextColor(slateText[0], slateText[1], slateText[2]);
            const subLines = doc.splitTextToSize(
              subcategory.description,
              contentWidth - accentBarWidth - 16
            );
            doc.text(subLines, textX + 4, textY);
            textY += subLines.length * lineHeight + 1.5;
            doc.setFont(baseFont, normalStyle);
            doc.setFontSize(10.5);
            doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
          }
        });

        cursorY = blockTop + blockHeight + 6;
      });

      if (selectedAppendices.length) {
        doc.setFont(baseFont, normalStyle);
        doc.setFontSize(10.5);

        const appendixEntries = selectedAppendices.map((appendix) => ({
          appendix,
          descriptionLines: appendix.description
            ? doc.splitTextToSize(appendix.description, contentWidth - 10)
            : null,
        }));

        const appendixHeight =
          12 +
          appendixEntries.reduce((height, entry) => {
            const descriptionHeight = entry.descriptionLines
              ? entry.descriptionLines.length * lineHeight
              : 0;
            return height + lineHeight + descriptionHeight + 1.5;
          }, 0);

        ensureSpace(appendixHeight + 4);

        doc.setFont(baseFont, boldStyle);
        doc.setFontSize(13);
        doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
        doc.text("Bilagor", pageMarginX, cursorY);
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.line(pageMarginX, cursorY + 2, pageMarginX + 30, cursorY + 2);
        cursorY += 7;

        appendixEntries.forEach(({ appendix, descriptionLines }) => {
          doc.setFont(baseFont, normalStyle);
          doc.setFontSize(10.5);
          doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
          doc.text(`• ${appendix.title}`, pageMarginX, cursorY);
          cursorY += lineHeight;

          if (descriptionLines) {
            doc.setFont(baseFont, normalStyle);
            doc.setFontSize(9.5);
            doc.setTextColor(slateText[0], slateText[1], slateText[2]);
            doc.text(descriptionLines, pageMarginX + 4, cursorY);
            cursorY += descriptionLines.length * lineHeight + 1.5;
          }
        });

        cursorY += 4;
      }

      if (isKoncernSelected) {
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
        const imageX = pageWidth - pageMarginX - imageWidth;
        const imageY = 70;

        doc.addImage(
          koncernImage.dataUrl,
          koncernImage.format,
          imageX,
          imageY,
          imageWidth,
          imageHeight,
          undefined,
          "FAST"
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
          const descriptionLines = doc.splitTextToSize(
            company.description,
            contentWidth
          );
          doc.text(descriptionLines, pageMarginX, companyY);
          companyY += descriptionLines.length * lineHeight;

          doc.setTextColor(2, 53, 98);
          doc.text(company.website, pageMarginX, companyY);
          doc.setTextColor(15, 23, 42);
          companyY += lineHeight + 2;
        });
      }

      doc.save("nils-ahlgren-katalog.pdf");
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
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
          Katalog
        </span>
        <h1 className="text-2xl font-semibold text-slate-900">Generera katalog</h1>
        <p className="max-w-2xl text-sm text-neutral-600">
          Här förbereder vi stödet för att skapa en kundanpassad katalog utifrån en XML-fil som kommer läsas in i nästa steg.
          Välj de kategorier och bilagor som ska ingå så kopplar vi ihop dem med innehållet när strukturen är på plats.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6 rounded-2xl border border-white/60 bg-white/80 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <header className="max-w-xl space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Välj kategorier</h2>
              <p className="text-sm text-neutral-600">
                Kategorierna nedan är preliminära. När XML-strukturen är klar laddas listan automatiskt från filen och dina val sparas här.
              </p>
            </header>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition",
                areAllCategoriesSelected
                  ? "border-sky-300 bg-sky-50 text-sky-800"
                  : "border-neutral-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50"
              )}
            >
              <input
                ref={includeAllCheckboxRef}
                type="checkbox"
                className="h-4 w-4 rounded border-neutral-300 text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                checked={areAllCategoriesSelected}
                onChange={(event) => handleToggleAllCategories(event.target.checked)}
              />
              Inkludera allt
            </label>
          </div>

          <div className="space-y-4">
            {placeholderCategories.map((category) => {
              const subcategories = category.subcategories ?? [];
              const relevantIds = subcategories.length
                ? subcategories.map((sub) => sub.id)
                : [category.id];
              const checkedCount = relevantIds.filter((id) => categorySelection[id]).length;
              const allSelected = checkedCount === relevantIds.length && relevantIds.length > 0;
              const partiallySelected = checkedCount > 0 && checkedCount < relevantIds.length;

              return (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isChecked={allSelected}
                  isIndeterminate={partiallySelected}
                  selection={categorySelection}
                  onToggleCategory={toggleCategoryGroup}
                  onToggleSubcategory={toggleSubcategory}
                />
              );
            })}
          </div>
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
                      : "border-transparent hover:border-sky-200 hover:bg-sky-50"
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
                    {section.description && (
                      <span className="mt-1 block text-sm text-neutral-600">{section.description}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-6">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Sammanfattning</h2>
              <p className="text-sm text-neutral-600">
                I nästa steg ersätts detta med en förhandsgranskning av katalogens struktur och ett utkast till PDF.
              </p>
            </header>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>
                <strong>{selectedCategoryCount}</strong> valda kategorisektioner
              </li>
              <li>
                <strong>{selectedAppendixCount}</strong> bilagor
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
                  pdfState.status === "error"
                    ? "text-red-600"
                    : "text-neutral-600"
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

interface CategoryCardProps {
  category: CatalogCategory;
  isChecked: boolean;
  isIndeterminate: boolean;
  selection: SelectionState;
  onToggleCategory: (category: CatalogCategory, checked: boolean) => void;
  onToggleSubcategory: (subcategoryId: string, checked: boolean) => void;
}

function CategoryCard({
  category,
  isChecked,
  isIndeterminate,
  selection,
  onToggleCategory,
  onToggleSubcategory,
}: CategoryCardProps) {
  const parentCheckboxRef = useIndeterminateCheckbox(isIndeterminate);

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-200/70 bg-white/80 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <input
          ref={parentCheckboxRef}
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-neutral-300 text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          checked={isChecked}
          onChange={(event) => onToggleCategory(category, event.target.checked)}
        />
        <div className="space-y-1">
          <span className="block text-base font-semibold text-slate-900">{category.name}</span>
          {category.description && (
            <span className="block text-sm text-neutral-600">{category.description}</span>
          )}
        </div>
      </div>

      {category.subcategories?.length ? (
        <ul className="space-y-2 border-l border-dashed border-neutral-200 pl-5">
          {category.subcategories.map((subcategory) => (
            <li key={subcategory.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2 transition hover:border-sky-200 hover:bg-sky-50">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  checked={selection[subcategory.id] ?? false}
                  onChange={(event) => onToggleSubcategory(subcategory.id, event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{subcategory.name}</span>
                  {subcategory.description && (
                    <span className="block text-sm text-neutral-600">{subcategory.description}</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
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
    }
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

interface EstimateCategoryOptions {
  baseFont: string;
  boldStyle: "bold";
  normalStyle: "normal";
  category: CatalogCategory;
  selectedSubcategories: CatalogSubcategory[];
  includeWholeCategory: boolean;
  contentWidth: number;
  lineHeight: number;
  accentBarWidth: number;
}

function estimateCategoryBlockHeight(
  doc: jsPDF,
  options: EstimateCategoryOptions
): number {
  const {
    baseFont,
    boldStyle,
    normalStyle,
    category,
    selectedSubcategories,
    includeWholeCategory,
    contentWidth,
    lineHeight,
    accentBarWidth,
  } = options;

  const previousFont = doc.getFont();
  const previousFontSize = doc.getFontSize();

  const paddingTop = 6;
  const paddingBottom = 6;
  let height = paddingTop;

  doc.setFont(baseFont, boldStyle);
  doc.setFontSize(12.5);
  height += 5.5;

  doc.setFont(baseFont, normalStyle);
  doc.setFontSize(10.5);

  if (category.description) {
    const descriptionLines = doc.splitTextToSize(
      category.description,
      contentWidth - accentBarWidth - 12
    );
    height += descriptionLines.length * lineHeight + 2;
  }

  if (includeWholeCategory) {
    height += lineHeight + 1.5;
  }

  selectedSubcategories.forEach((subcategory) => {
    height += lineHeight;
    if (subcategory.description) {
      const subLines = doc.splitTextToSize(
        subcategory.description,
        contentWidth - accentBarWidth - 16
      );
      height += subLines.length * lineHeight + 1.5;
    }
  });

  height += paddingBottom;

  doc.setFont(previousFont.fontName, previousFont.fontStyle);
  doc.setFontSize(previousFontSize);

  return height;
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
