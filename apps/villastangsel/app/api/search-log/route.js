// app/api/search-log/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE, // server only!
  { auth: { persistSession: false } }
);

export async function POST(req) {
  try {
    const { q, result, lat, lng, source } = await req.json();

    // Hämta lite extra meta (valfritt)
    const ua = req.headers.get("user-agent") || null;
    // Försiktig IP (anonymisera / kapa sista oktetten)
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
