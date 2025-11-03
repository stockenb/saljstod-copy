// app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;

  // Läs in parametrar
  const code = url.searchParams.get("code");
  const next =
    url.searchParams.get("redirect") ||
    url.searchParams.get("next") ||
    url.searchParams.get("redirect_to") ||
    "/";

  // Förbered ett svar-objekt direkt, så att Supabase kan sätta cookies på det
  const redirectOnError = NextResponse.redirect(`${origin}/login?error=invalid_link`);
  const redirectOnUnauthorized = NextResponse.redirect(`${origin}/login?error=unauthorized`);
  const redirectOnSuccess = NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);

  if (!code) {
    return redirectOnError;
  }

  // Skapa en server-klient med cookie-adapter som skriver cookies på vårt Response-objekt
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name: string) => request.cookies.get(name)?.value,
      set: (name: string, value: string, options?: CookieOptions) => {
        const cookieOptions = options ?? {};
        // Vi sätter cookien på *alla* potentiella svar, så vilket vi än returnerar har rätt cookies
        redirectOnError.cookies.set({ name, value, ...cookieOptions });
        redirectOnUnauthorized.cookies.set({ name, value, ...cookieOptions });
        redirectOnSuccess.cookies.set({ name, value, ...cookieOptions });
      },
      remove: (name: string, options?: CookieOptions) => {
        const cookieOptions = options ?? {};
        redirectOnError.cookies.set({
          name,
          value: "",
          ...cookieOptions,
          expires: new Date(0),
        });
        redirectOnUnauthorized.cookies.set({
          name,
          value: "",
          ...cookieOptions,
          expires: new Date(0),
        });
        redirectOnSuccess.cookies.set({
          name,
          value: "",
          ...cookieOptions,
          expires: new Date(0),
        });
      },
    },
  });

  // Byt in koden mot en session (sätter cookies via adapter ovan)
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return redirectOnError;
  }

  // Verifiera att vi har en user
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return redirectOnError;
  }

  // Behörighetskontroll mot profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profileError) {
    await supabase.auth.signOut();
    return redirectOnUnauthorized;
  }

  // Allt OK → skicka vidare
  return redirectOnSuccess;
}
