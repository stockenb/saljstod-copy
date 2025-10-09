import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED = ["/", "/rapporter", "/nyheter", "/profil", "/admin"];

export async function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const path = nextUrl.pathname;

  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  if (!isProtected) return res;

  const { data: { user } } = await supabase.auth.getUser();
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
