import { NextRequest, NextResponse } from "next/server";

import { findArticles } from "@/lib/artikelbas-feed";
import {
  PACKAGING_FILTER_VALUES,
  type PackagingFilterValue,
} from "@/lib/artikelbas-filters";

function isPackagingFilterValue(value: string): value is PackagingFilterValue {
  return (PACKAGING_FILTER_VALUES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const excludeBulkParam = url.searchParams.get("excludeBulk");
  const excludeBulk =
    excludeBulkParam === "1" || excludeBulkParam?.toLowerCase() === "true";
  const packagingFilters = url.searchParams
    .getAll("packaging")
    .filter(isPackagingFilterValue);

  if (!query || !query.trim()) {
    return NextResponse.json(
      { error: "Ange en söktext för att hitta artiklar." },
      { status: 400 },
    );
  }

  try {
    const articles = await findArticles(query, { excludeBulk, packagingFilters });
    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Kunde inte läsa artikelbasen", error);
    return NextResponse.json(
      { error: "Kunde inte läsa artikelbasen." },
      { status: 500 },
    );
  }
}
