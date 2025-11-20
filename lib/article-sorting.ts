export type SizeMetrics = { thickness: number | null; length: number | null };

function normalizeSwedishDecimal(value: string): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, "").replace(/,/g, ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function findFirstNumericValue(text: string | null | undefined): number | null {
  if (!text) {
    return null;
  }

  const match = text.match(/\d+(?:[.,]\d+)?/);
  if (!match) {
    return null;
  }

  return normalizeSwedishDecimal(match[0]) ?? null;
}

export function parseSizeMetrics(sizeText: string): SizeMetrics {
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

const PACKAGING_RANK = {
  sb: 0,
  paket: 1,
  hink: 2,
  bulk: 3,
  other: 4,
} as const;

export type PackagingRank = (typeof PACKAGING_RANK)[keyof typeof PACKAGING_RANK];

export function normalizePackagingLabel(packaging: string | null | undefined) {
  return (packaging ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("sv-SE")
    .replace(/\s+/g, " ")
    .trim();
}

export function isBulkPackaging(articleNumber: string, normalizedPackaging: string) {
  const normalizedArticleNumber = articleNumber.normalize("NFKC").toUpperCase();

  if (normalizedArticleNumber.startsWith("B")) {
    return true;
  }

  return normalizedPackaging.includes("bulk") || normalizedPackaging.includes("kartong");
}

export function resolvePackagingRank(
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

export function resolvePackagingQuantity(
  specMap: Map<string, string>,
  packaging: string | null,
  normalizeKey: (label: string) => string,
): number | null {
  const packagingQuantity = findFirstNumericValue(packaging ?? "");
  if (packagingQuantity !== null) {
    return packagingQuantity;
  }

  for (const [label, value] of specMap.entries()) {
    const normalizedLabel = normalizeKey(label);
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

export type SortableArticleInput = {
  articleNumber: string;
  sizeValue: string | null | undefined;
  packaging: string | null;
  specMap: Map<string, string>;
};

export type SortableArticle = SortableArticleInput & {
  sizeMetrics: SizeMetrics;
  packagingRank: PackagingRank;
  packagingQuantity: number | null;
  isBulk: boolean;
  normalizedPackaging: string;
};

export function buildSortableArticle(
  entry: SortableArticleInput,
  normalizeKey: (label: string) => string,
): SortableArticle {
  const normalizedPackaging = normalizePackagingLabel(entry.packaging);
  const sizeMetrics = parseSizeMetrics(entry.sizeValue ?? "");
  const packagingRank = resolvePackagingRank(entry.articleNumber, normalizedPackaging);
  const packagingQuantity = resolvePackagingQuantity(entry.specMap, entry.packaging, normalizeKey);
  const isBulk = isBulkPackaging(entry.articleNumber, normalizedPackaging);

  return {
    ...entry,
    normalizedPackaging,
    sizeMetrics,
    packagingRank,
    packagingQuantity,
    isBulk,
  };
}

export function compareSortableArticles(a: SortableArticle, b: SortableArticle): number {
  const thicknessA = a.sizeMetrics.thickness ?? Number.POSITIVE_INFINITY;
  const thicknessB = b.sizeMetrics.thickness ?? Number.POSITIVE_INFINITY;
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

  const packagingCompare = (a.packaging ?? "").localeCompare(b.packaging ?? "", "sv-SE", {
    sensitivity: "accent",
  });
  if (packagingCompare !== 0) {
    return packagingCompare;
  }

  return a.articleNumber.localeCompare(b.articleNumber, "sv-SE", {
    numeric: true,
    sensitivity: "base",
  });
}
