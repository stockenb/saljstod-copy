import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./lib/supabase/env";

const PROTECTED = ["/", "/rapporter", "/nyheter", "/profil", "/admin"];

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const res = NextResponse.next();

  let supabase: ReturnType<typeof createServerClient> | null = null;
  try {
    supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () =>
          req.cookies.getAll().map(({ name, value }) => ({ name, value })),
        setAll: async (cookies) => {
          for (const { name, value, options } of cookies) {
            res.cookies.set(name, value, options ? { ...options } : undefined);
          }
        },
      },
    });
    await supabase.auth.getUser().catch(() => undefined);
  } catch (error) {
    return res;
  }

  if (!supabase) {
    return res;
  }

  const path = nextUrl.pathname;

  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  if (!isProtected) return res;

  const userResponse = await supabase.auth.getUser().catch(() => null);
  const user = userResponse?.data.user ?? null;
  if (!user) {
    const url = new URL("/login", nextUrl.origin);
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null }>();
    if (profile?.role !== "ADMIN") return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
