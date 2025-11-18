import { NextRequest, NextResponse } from "next/server";

import {
  getProductsForCategory,
  type Product,
  type ProductWithVariants,
} from "@/lib/product-feed";

type CatalogProductResponse = ProductWithVariants;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const categoryIds: unknown = body?.categoryIds;
  const includeDescendants = body?.includeDescendants !== false;

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

    const catalogProducts = Array.from(productMap.values());

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
    ...(product as Product),
    variants: product.variants ?? [],
  } satisfies CatalogProductResponse;
}
