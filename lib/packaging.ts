import type { PackagingFilterValue } from "./artikelbas-filters";
import type { Product } from "./product-feed";

function normalizePackaging(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.normalize("NFKC").toLocaleLowerCase("sv-SE");
}

const PACKAGING_FILTER_TARGETS: Record<Exclude<PackagingFilterValue, "bulk">, string> = {
  "small-pack": normalizePackaging("SB förpackning") ?? "sb förpackning",
  bucket: normalizePackaging("Hink") ?? "hink",
  package: normalizePackaging("Paket") ?? "paket",
};

export function matchesPackagingFilter(
  product: Pick<Product, "articleNumber" | "primaryPackaging">,
  filter: PackagingFilterValue,
): boolean {
  if (filter === "bulk") {
    return product.articleNumber.startsWith("B");
  }

  const normalizedPackaging = normalizePackaging(product.primaryPackaging);
  const expected = PACKAGING_FILTER_TARGETS[filter];

  if (!expected || !normalizedPackaging) {
    return false;
  }

  return normalizedPackaging === expected;
}

export function productMatchesPackagingFilters(
  product: Pick<Product, "articleNumber" | "primaryPackaging">,
  filters: Iterable<PackagingFilterValue>,
): boolean {
  const filterArray = Array.from(filters);

  if (filterArray.length === 0) {
    return true;
  }

  return filterArray.some((filter) => matchesPackagingFilter(product, filter));
}

export { normalizePackaging };
