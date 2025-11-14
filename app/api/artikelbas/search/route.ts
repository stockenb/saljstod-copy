import { NextRequest, NextResponse } from "next/server";

import { findArticles } from "@/lib/artikelbas-feed";
import {
  PACKAGING_FILTER_VALUES,
  type PackagingFilterValue,
} from "@/lib/artikelbas-filters";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 25;

function isPackagingFilterValue(value: string): value is PackagingFilterValue {
  return (PACKAGING_FILTER_VALUES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get("q");
  const limitParam = url.searchParams.get("limit");
  const excludeBulkParam = url.searchParams.get("excludeBulk");
  const excludeBulk =
    excludeBulkParam === "1" || excludeBulkParam?.toLowerCase() === "true";
  const packagingFilters = url.searchParams
    .getAll("packaging")
    .filter(isPackagingFilterValue);

  if (!rawQuery || !rawQuery.trim()) {
    return NextResponse.json({ articles: [] });
  }

  const trimmed = rawQuery.trim();
  const parsedLimit = Number.parseInt(limitParam ?? "", 10);
  const limit = Number.isNaN(parsedLimit)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(parsedLimit, 1), MAX_LIMIT);

  const normalizedQuery = trimmed.includes("%") ? trimmed : `%${trimmed}%`;

  try {
    const articles = await findArticles(normalizedQuery, {
      excludeBulk,
      packagingFilters,
    });
    return NextResponse.json({ articles: articles.slice(0, limit) });
  } catch (error) {
    console.error("Kunde inte söka i artikelbasen", error);
    return NextResponse.json(
      { error: "Kunde inte söka i artikelbasen." },
      { status: 500 },
    );
  }
}
