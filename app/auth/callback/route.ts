import { NextResponse } from "next/server";
import { createServerClientSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createServerClientSupabase();
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Ogiltig eller utgången länk
  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
