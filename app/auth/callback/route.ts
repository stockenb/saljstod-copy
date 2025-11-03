// app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;

  // Hjälpare: skicka tillbaka till /login med diagnos i query
  const fail = (reason: string, detail?: string) => {
    const out = new URL(`${origin}/login`);
    out.searchParams.set("error", "invalid_link");
    out.searchParams.set("reason", reason);
    if (detail) out.searchParams.set("detail", detail.slice(0, 200));
    return NextResponse.redirect(out);
  };

  try {
    const code = url.searchParams.get("code");
    const codeVerifier =
      url.searchParams.get("code_verifier") ??
      url.searchParams.get("codeVerifier") ??
      url.searchParams.get("code-verifier") ??
      null;
    const codeVerifierFromCookies =
      request.cookies
        .getAll()
        .find((cookie) => cookie.name.endsWith("-code-verifier"))?.value ?? null;
    const next =
      url.searchParams.get("redirect") ||
      url.searchParams.get("next") ||
      url.searchParams.get("redirect_to") ||
      "/";

    if (!code) {
      console.error("[auth/callback] missing ?code param. Full URL:", request.url);
      return fail("missing_code_param");
    }

    if (!codeVerifier && !codeVerifierFromCookies) {
      console.error(
        "[auth/callback] missing code_verifier (neither query param nor cookie present).",
      );
      return fail("missing_code_verifier");
    }

    // Förbered tre svar där vi kan skriva cookies (oavsett utfall)
    const redirectOnSuccess = NextResponse.redirect(
      `${origin}${next.startsWith("/") ? next : "/"}`
    );
    const redirectOnUnauthorized = NextResponse.redirect(`${origin}/login?error=unauthorized`);

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get: (name: string) => {
          const existing = request.cookies.get(name)?.value;
          if (existing) return existing;

          if (codeVerifier && name.endsWith("-code-verifier")) {
            return codeVerifier;
          }

          return undefined;
        },
        set: (name: string, value: string, options?: CookieOptions) => {
          const opt = options ?? {};
          redirectOnSuccess.cookies.set({ name, value, ...opt });
          redirectOnUnauthorized.cookies.set({ name, value, ...opt });
        },
        remove: (name: string, options?: CookieOptions) => {
          const opt = options ?? {};
          redirectOnSuccess.cookies.set({ name, value: "", ...opt, expires: new Date(0) });
          redirectOnUnauthorized.cookies.set({ name, value: "", ...opt, expires: new Date(0) });
        },
      },
    });

    // Byt auth-koden mot session-cookies
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error("[auth/callback] exchange error:", exchangeError);
      return fail("exchange_error", exchangeError.message);
    }

    // Verifiera att vi har användare
    const {
      data: { user },
      error: getUserErr,
    } = await supabase.auth.getUser();

    if (getUserErr || !user) {
      console.error("[auth/callback] getUser error:", getUserErr);
      return fail("no_user");
    }

    // Behörighetskontroll mot profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[auth/callback] profile query error:", profileError);
    }

    if (!profile || profileError) {
      await supabase.auth.signOut();
      return redirectOnUnauthorized;
    }

    // OK → vidare
    return redirectOnSuccess;
  } catch (e: any) {
    console.error("[auth/callback] unexpected error:", e);
    return fail("unexpected", e?.message ?? "unknown");
  }
}
