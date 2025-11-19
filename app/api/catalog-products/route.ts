import { NextRequest, NextResponse } from "next/server";

import { PACKAGING_FILTER_VALUES, type PackagingFilterValue } from "@/lib/artikelbas-filters";
import { filterCatalogProducts, normalizeSkuList } from "@/lib/catalog-filters";
import {
  getProductWithVariantsBySku,
  getProductsForCategory,
  type ProductWithVariants,
} from "@/lib/product-feed";

type CatalogProductResponse = ProductWithVariants;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const categoryIds: unknown = body?.categoryIds;
  const includeDescendants = body?.includeDescendants !== false;
  const packagingFilters = parsePackagingFilters(body?.packagingFilters);
  const excludeSkus = normalizeSkuList(toStringArray(body?.excludeSkus));
  const excludeSet = new Set(excludeSkus);
  const includeSkus = normalizeSkuList(toStringArray(body?.includeSkus)).filter(
    (sku) => !excludeSet.has(sku),
  );

  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    return NextResponse.json(
      { error: "Ange minst en kategori att generera produkter för." },
      { status: 400 },
    );
  }

  const trimmedIds = categoryIds
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter(Boolean);

  if (trimmedIds.length === 0) {
    return NextResponse.json(
      { error: "Ange minst en kategori att generera produkter för." },
      { status: 400 },
    );
  }

  try {
    const productMap = new Map<string, CatalogProductResponse>();

    for (const categoryId of trimmedIds) {
      const products = await getProductsForCategory(categoryId, {
        includeDescendants,
      });

      products.forEach((product) => {
        if (productMap.has(product.articleNumber)) {
          return;
        }
        productMap.set(product.articleNumber, normalizeProduct(product));
      });
    }

    if (includeSkus.length > 0) {
      const includedProducts = await Promise.all(
        includeSkus.map((sku) => getProductWithVariantsBySku(sku)),
      );

      includedProducts.forEach((product) => {
        if (!product) {
          return;
        }
        if (excludeSet.has(product.articleNumber)) {
          return;
        }
        if (productMap.has(product.articleNumber)) {
          return;
        }
        productMap.set(product.articleNumber, normalizeProduct(product));
      });
    }

    const catalogProducts = filterCatalogProducts(Array.from(productMap.values()), {
      packagingFilters,
      includeSkus,
      excludeSkus,
    });

    return NextResponse.json({ products: catalogProducts });
  } catch (error) {
    console.error("Kunde inte läsa produkter för katalog", error);
    return NextResponse.json(
      { error: "Kunde inte läsa produkter från produktflödet." },
      { status: 500 },
    );
  }
}

function normalizeProduct(product: ProductWithVariants): CatalogProductResponse {
  return {
    ...product,
    variants: product.variants ?? [],
  } satisfies CatalogProductResponse;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(/[\s,;]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

function parsePackagingFilters(value: unknown): PackagingFilterValue[] {
  const allowed = new Set<PackagingFilterValue>(PACKAGING_FILTER_VALUES);
  const candidates = toStringArray(value);

  return Array.from(
    new Set(
      candidates.filter((candidate): candidate is PackagingFilterValue =>
        allowed.has(candidate as PackagingFilterValue),
      ),
    ),
  );
}
