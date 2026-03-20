import type { PackagingFilterValue } from "./artikelbas-filters";
import { matchesPackagingFilter } from "./packaging";
import type { ProductWithVariants } from "./product-feed";

type CatalogFilterOptions = {
  packagingFilters?: PackagingFilterValue[];
  includeSkus?: string[];
  excludeSkus?: string[];
};

function normalizeSkuList(values: string[] = []): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function shouldKeepRow(
  sku: string,
  primaryPackaging: string | null,
  packagingFilters: Set<PackagingFilterValue>,
  includeSet: Set<string>,
): boolean {
  if (includeSet.has(sku)) {
    return true;
  }

  if (packagingFilters.size === 0) {
    return true;
  }

  for (const filter of packagingFilters) {
    if (matchesPackagingFilter({ articleNumber: sku, primaryPackaging }, filter)) {
      return true;
    }
  }

  return false;
}

export function filterCatalogProducts(
  products: ProductWithVariants[],
  options: CatalogFilterOptions = {},
): ProductWithVariants[] {
  const packagingFilters = new Set<PackagingFilterValue>(options.packagingFilters ?? []);
  const excludeSkus = new Set(normalizeSkuList(options.excludeSkus));
  const includeSkus = new Set(normalizeSkuList(options.includeSkus));

  return products
    .filter((product) => !excludeSkus.has(product.articleNumber))
    .map((product) => {
      const variants = product.variants;
      const filteredVariants = variants
        .filter((variant) => !excludeSkus.has(variant.articleNumber))
        .filter((variant) =>
          shouldKeepRow(
            variant.articleNumber,
            variant.primaryPackaging,
            packagingFilters,
            includeSkus,
          ),
        );

      if (variants.length > 0) {
        if (filteredVariants.length === 0) {
          if (includeSkus.has(product.articleNumber)) {
            return { ...product, variants: [] };
          }
          return null;
        }

        if (filteredVariants.length === variants.length) {
          return product;
        }

        return { ...product, variants: filteredVariants };
      }

      if (!shouldKeepRow(product.articleNumber, product.primaryPackaging, packagingFilters, includeSkus)) {
        return null;
      }

      return product;
    })
    .filter((product): product is ProductWithVariants => product !== null);
}

export { normalizeSkuList };
