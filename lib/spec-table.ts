export type ProductSpecification = { key: string; value: string };

export type SpecColumn = {
  key: string;
  normalizedKey: string;
  label: string;
};

type SpecContainer = { specs: ProductSpecification[] };

const HIDDEN_SPEC_KEYS = new Set([
  "benämning engelska",
  "coating",
  "ytbehandling",
  "benämning",
]);

const SPEC_LABEL_MAP: Record<string, string> = {
  "antal i primärförpackning": "Antal",
  "primärförpackning": "Förp.",
  "antal i sekundärförpackning": "Antal sekundärförp.",
  "sb förpackning": "Småpack",
};

export function normalizeSpecKey(key: string): string {
  return key
    .normalize("NFKC")
    .toLocaleLowerCase("sv-SE")
    .replace(/\s+/g, " ")
    .trim();
}

function isPackagingCount(key: string): boolean {
  const normalized = normalizeSpecKey(key);
  return normalized.includes("antal i prim") || normalized === "antal i primärförpackning";
}

function isEanKey(key: string): boolean {
  const normalized = normalizeSpecKey(key);
  return normalized.startsWith("ean");
}

function isWeightKey(key: string): boolean {
  return normalizeSpecKey(key) === "vikt";
}

export function shouldIncludeSpecColumn(spec: ProductSpecification): boolean {
  if (!spec.key) return false;
  const normalizedKey = normalizeSpecKey(spec.key);
  if (HIDDEN_SPEC_KEYS.has(normalizedKey)) return false;
  if (isEanKey(normalizedKey) || isWeightKey(normalizedKey)) return false;

  if (isPackagingCount(normalizedKey)) {
    const normalizedValue = spec.value
      .toString()
      .replace(/,/g, ".")
      .replace(/[^0-9.]/g, "")
      .trim();
    const numeric = Number.parseFloat(normalizedValue || "");
    if (!Number.isNaN(numeric) && numeric === 1) {
      return false;
    }
  }

  return true;
}

function formatSpecLabel(key: string): string {
  const normalizedKey = normalizeSpecKey(key);
  return SPEC_LABEL_MAP[normalizedKey] ?? key;
}

export function formatSpecValue(value: string): string {
  if (!value) return "";
  return value.replace(/\bStyck\b/gi, "st");
}

export function collectSpecColumns(items: SpecContainer[], maxColumns = 8): SpecColumn[] {
  const columns: SpecColumn[] = [];
  const seen = new Set<string>();

  items.forEach((item) => {
    item.specs.forEach((spec) => {
      if (!shouldIncludeSpecColumn(spec)) return;
      const normalizedKey = normalizeSpecKey(spec.key);
      if (seen.has(normalizedKey)) return;

      seen.add(normalizedKey);
      columns.push({
        key: spec.key,
        normalizedKey,
        label: formatSpecLabel(spec.key),
      });
    });
  });

  return columns.slice(0, maxColumns);
}

export function getSpecValueForColumn(
  item: SpecContainer,
  column: SpecColumn,
): string {
  const match = item.specs.find(
    (spec) => normalizeSpecKey(spec.key) === column.normalizedKey && shouldIncludeSpecColumn(spec),
  );
  return match?.value ?? "";
}
