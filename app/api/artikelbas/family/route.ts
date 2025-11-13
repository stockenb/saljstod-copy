import { NextRequest, NextResponse } from "next/server";

import { findArticles } from "@/lib/artikelbas-feed";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const excludeBulkParam = url.searchParams.get("excludeBulk");
  const excludeBulk =
    excludeBulkParam === "1" || excludeBulkParam?.toLowerCase() === "true";

  if (!query || !query.trim()) {
    return NextResponse.json(
      { error: "Ange en söktext för att hitta artiklar." },
      { status: 400 },
    );
  }

  try {
    const articles = await findArticles(query, { excludeBulk });
    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Kunde inte läsa artikelbasen", error);
    return NextResponse.json(
      { error: "Kunde inte läsa artikelbasen." },
      { status: 500 },
    );
  }
}
