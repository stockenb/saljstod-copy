import { NextResponse } from "next/server";

import { getCategoryTree } from "@/lib/product-feed";

export async function GET() {
  try {
    const categories = await getCategoryTree();
    return NextResponse.json({ categories, rootCategoryId: null });
  } catch (error) {
    console.error("Kunde inte läsa kategorier", error);
    return NextResponse.json(
      { error: "Kunde inte läsa kategorier från produktflödet." },
      { status: 500 },
    );
  }
}
