import { NextRequest, NextResponse } from "next/server";

import { getTopLevelCategories } from "@/lib/product-feed";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parentId = url.searchParams.get("parentId") ?? undefined;

  try {
    const categories = await getTopLevelCategories(parentId ?? undefined);
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Kunde inte läsa kategorier", error);
    return NextResponse.json(
      { error: "Kunde inte läsa kategorier från produktflödet." },
      { status: 500 },
    );
  }
}
