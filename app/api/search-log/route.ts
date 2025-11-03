import { NextResponse } from "next/server";

export async function POST(_req: Request) {
  return NextResponse.json(
    {
      ok: false,
      error: "Sökloggning är inaktiverad tills Supabase återinförs.",
    },
    { status: 503 }
  );
}
