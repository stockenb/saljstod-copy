// app/api/save-project/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";          // service role kräver Node, inte Edge
export const dynamic = "force-dynamic";   // förhindra statisk prerender av route

export async function POST(req) {
  // Läs env inne i funktionen (inte top-level)
  const SUPABASE_URL = process.env.SUPABASE_URL;
  // Backwards compatibility: stöd både ..._ROLE_KEY och ..._ROLE
  const SUPABASE_SERVICE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    const missing = [];
    if (!SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!SUPABASE_SERVICE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE");
    return NextResponse.json(
      { ok: false, error: `Supabase env not configured: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  // Skapa klienten här (lazy)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const body = await req.json();
    const {
      action,
      runs,
      gates,
      height, color, mesh,
      includeConcrete, includeGate,
      results,
      lineItems,
      address,
      mapImageUrl,
      shareUrl,
    } = body;

    const { data, error } = await supabase
      .from("project_snapshots")
      .insert({
        action,
        runs,
        gates,
        height, color, mesh,
        include_concrete: includeConcrete,
        include_gate: includeGate,
        results,
        line_items: lineItems,
        address,
        map_image_url: mapImageUrl, // lång URL? se tipset nedan
        share_url: shareUrl ?? null,  
        
        payload: {
          runs, gates, height, color, mesh,
          includeConcrete, includeGate, results, lineItems
        }
        
      })
      .select("id, share_url")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id }, { status: 200 });
  } catch (e) {
    console.error("save-project route error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
