import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED = ["/", "/rapporter", "/nyheter", "/profil", "/admin"];

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const res = NextResponse.next();

  let supabase: ReturnType<typeof createServerClient> | null = null;
  try {
    supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => req.cookies.get(name)?.value,
          set: (name, value, options) => res.cookies.set(name, value, options),
          remove: (name, options) => res.cookies.set(name, "", { ...options, expires: new Date(0) }),
        },
      }
    );
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
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "ADMIN") return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
