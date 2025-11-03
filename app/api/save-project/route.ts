import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request) {
  return NextResponse.json(
    {
      ok: false,
      error: "Projektlagring är inaktiverad tills Supabase återinförs.",
    },
    { status: 503 }
  );
}
