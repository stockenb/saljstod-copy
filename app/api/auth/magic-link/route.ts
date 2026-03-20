import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }

  const supabase = createClient();

  // Kolla om e-posten finns i allowed_emails-tabellen
  const { data: allowed } = await supabase
    .from("allowed_emails")
    .select("email")
    .eq("email", email.toLowerCase())
    .single();

  if (!allowed) {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error("Magic link error:", error.message);
    return NextResponse.json({ error: "auth_failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
