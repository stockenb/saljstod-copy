import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(
    {
      ok: false,
      message: `PDF-export för rapport ${params.id} är inaktiverad tills Supabase återinförs.`,
    },
    { status: 503 }
  );
}
