import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const user = data.user;

      // Hämta roll från allowed_emails
      const { data: allowed } = await supabase
        .from("allowed_emails")
        .select("role")
        .eq("email", user.email!.toLowerCase())
        .single();

      const role = allowed?.role || "user";

      // Upserta profil med roll
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email!.toLowerCase(),
        role,
        name: user.user_metadata?.name || user.email!.split("@")[0],
      });

      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
