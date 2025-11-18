import { NextRequest, NextResponse } from "next/server";

import { getProductByArticleNumber, type Product } from "@/lib/product-feed";

type NormalizedProduct = {
  articleNumber: string;
  title: string;
  link: string;
  image: string;
  description: string;
  weight: string;
  specs: { key: string; value: string }[];
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const articleNumber = url.searchParams.get("id");

  if (!articleNumber) {
    return NextResponse.json({ error: "Ange ett artikelnummer." }, { status: 400 });
  }

  const trimmedArticleNumber = articleNumber.trim();

  try {
    const product = await getProductByArticleNumber(trimmedArticleNumber);

    if (!product) {
      return NextResponse.json(
        { error: "Ingen artikel hittades i flödet." },
        { status: 404 }
      );
    }

    const normalized = normalizeProduct(product);

    return NextResponse.json({ product: normalized });
  } catch (error) {
    console.error("Fel vid hämtning av produktblad", error);
    return NextResponse.json(
      { error: "Kunde inte hämta data från produktflödet." },
      { status: 500 }
    );
  }
}

const SPEC_KEY_REPLACEMENTS: Record<string, string> = {
  "Antal i primärförpackning": "Antal i primärförp.",
  "Antal i sekundärförpackning": "Antal i sekundärförp.",
  Primärförpackning: "Primärförp.",
};

function normalizeProduct(product: Product): NormalizedProduct {
  return {
    articleNumber: product.articleNumber,
    title: product.title,
    link: product.link,
    image: product.image,
    description: product.description,
    weight: product.weight,
    specs: normalizeSpecs(product.specs),
  };
}

function normalizeSpecs(specs: Product["specs"]): { key: string; value: string }[] {
  return specs
    .map(({ key, value }) => ({
      key: (SPEC_KEY_REPLACEMENTS[key] ?? key).trim() || "Specifikation",
      value: value.trim(),
    }))
    .filter((spec) => spec.value);
}
