import { NextResponse } from "next/server";

import { supabaseService } from "@/lib/supabase/serviceClient";

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE || "";

    if (!supabaseUrl || !serviceKey) {
      console.error("search-log error: missing Supabase configuration");
      return NextResponse.json({ ok: false, error: "supabase_not_configured" }, { status: 500 });
    }

    const supabase = supabaseService;

    const { q, result, lat, lng, source } = await req.json();

    const ua = req.headers.get("user-agent") || null;
    const ip =
      (req.headers.get("x-forwarded-for") || "")
        .split(",")[0]
        .trim()
        .replace(/\.\d+$/, ".0") || null;

    const { error } = await supabase
      .from("search_events")
      .insert([{ q, result, lat, lng, source, ua, ip }]);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("search-log error:", err);
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }
}
