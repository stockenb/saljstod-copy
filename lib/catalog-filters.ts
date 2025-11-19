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

  return Array.from(packagingFilters).some((filter) =>
    matchesPackagingFilter({ articleNumber: sku, primaryPackaging }, filter),
  );
}

export function filterCatalogProducts(
  products: ProductWithVariants[],
  options: CatalogFilterOptions = {},
): ProductWithVariants[] {
  const packagingFilters = new Set<PackagingFilterValue>(options.packagingFilters ?? []);
  const excludeSkus = new Set(normalizeSkuList(options.excludeSkus));
  const includeSkus = new Set(normalizeSkuList(options.includeSkus));

  // Exclusions take precedence over inclusions
  excludeSkus.forEach((sku) => {
    if (includeSkus.has(sku)) {
      includeSkus.delete(sku);
    }
  });

  return products
    .filter((product) => !excludeSkus.has(product.articleNumber))
    .map((product) => {
      const variants = product.variants ?? [];
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

      const keepParent = shouldKeepRow(
        product.articleNumber,
        product.primaryPackaging,
        packagingFilters,
        includeSkus,
      );

      if (!keepParent) {
        if (includeSkus.has(product.articleNumber)) {
          return product;
        }
        return null;
      }

      return product;
    })
    .filter((product): product is ProductWithVariants => product !== null);
}

export { normalizeSkuList };
