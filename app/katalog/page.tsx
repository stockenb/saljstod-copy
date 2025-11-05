"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

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
    id: "mobilt-stangsel",
    name: "Mobilt stängsel",
    description: "System och tillbehör för tillfälliga avspärrningar.",
    subcategories: [
      {
        id: "mobilt-stangsel-standardpaneler",
        name: "Standardpaneler",
        description: "Paneler för tillfälliga arbetsplatser och eventområden.",
      },
      {
        id: "mobilt-stangsel-grindar",
        name: "Grindar",
        description: "Gång- och fordonspassager som matchar de mobila panelerna.",
      },
      {
        id: "mobilt-stangsel-tillbehor",
        name: "Tillbehör",
        description: "Fötter, kopplingar och övriga komplement för montage.",
      },
    ],
  },
  {
    id: "industristangsel",
    name: "Industristängsel",
    description: "Robusta lösningar för industrier och andra skyddade områden.",
    subcategories: [
      {
        id: "industristangsel-nat",
        name: "Stängselnät",
      },
      {
        id: "industristangsel-stolpar",
        name: "Stolpar",
      },
      {
        id: "industristangsel-grindar",
        name: "Grindar",
      },
    ],
  },
  {
    id: "bullerskydd",
    name: "Bullerskydd",
    description: "Absorberande och reflekterande lösningar för bullerdämpning.",
  },
  {
    id: "intrangningsskydd",
    name: "Intrångsskydd",
    description: "Skyddssystem som förhindrar obehörigt intrång.",
  },
];

const appendixSections: AppendixSection[] = [
  {
    id: "koncerninformation",
    title: "Information om koncernen",
    description: "Presentationssidor med kontaktuppgifter och historia.",
  },
  {
    id: "reklam-stangsel",
    title: "Reklam & stängsellösningar",
    description: "Inkludera marknadsföringssidor kring speciallösningar.",
  },
  {
    id: "villkor",
    title: "Allmänna villkor",
    description: "Standardiserade villkorssidor för upphandlingar.",
  },
];

type SelectionState = Record<string, boolean>;

function createInitialSelection(categories: CatalogCategory[]): SelectionState {
  const initial: SelectionState = {};
  categories.forEach((category) => {
    if (category.subcategories?.length) {
      category.subcategories.forEach((sub) => {
        initial[sub.id] = false;
      });
    } else {
      initial[category.id] = false;
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

  const selectedCategoryCount = useMemo(
    () => Object.values(categorySelection).filter(Boolean).length,
    [categorySelection]
  );

  const selectedAppendixCount = useMemo(
    () => Object.values(appendixSelection).filter(Boolean).length,
    [appendixSelection]
  );

  const isGenerateDisabled = selectedCategoryCount === 0;

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
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">Välj kategorier</h2>
            <p className="text-sm text-neutral-600">
              Kategorierna nedan är preliminära. När XML-strukturen är klar laddas listan automatiskt från filen och dina val sparas här.
            </p>
          </header>

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
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-3 transition hover:border-sky-200 hover:bg-sky-50"
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
            >
              {isGenerateDisabled ? "Välj minst en kategori" : "Generera PDF (kommer snart)"}
            </Button>
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
