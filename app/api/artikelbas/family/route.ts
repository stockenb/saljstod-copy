import { NextRequest, NextResponse } from "next/server";

import { findArticlesByPrefix } from "@/lib/artikelbas-feed";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  if (!query || !query.trim()) {
    return NextResponse.json(
      { error: "Ange en söktext för att hitta artiklar." },
      { status: 400 },
    );
  }

  try {
    const articles = await findArticlesByPrefix(query);
    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Kunde inte läsa artikelbasen", error);
    return NextResponse.json(
      { error: "Kunde inte läsa artikelbasen." },
      { status: 500 },
    );
  }
}
