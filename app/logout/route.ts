import { NextResponse } from "next/server";
import { createServerClientSupabase } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createServerClientSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL));
}
