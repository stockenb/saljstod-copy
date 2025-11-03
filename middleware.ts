// middleware.ts (överst)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;


// Endast dessa vägar kräver inloggning
const PROTECTED = ["/", "/rapporter", "/nyheter", "/profil", "/admin"];

// Vägar som alltid ska vara öppna
const PUBLIC_ROUTES = ["/login", "/auth/callback", "/favicon.ico"];

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // 1) Släpp igenom publika vägar och Next statics direkt
  if (
    PUBLIC_ROUTES.some((p) => nextUrl.pathname === p || nextUrl.pathname.startsWith(p + "/")) ||
    nextUrl.pathname.startsWith("/_next/") ||
    nextUrl.pathname.startsWith("/assets/") // om du har egna statics
  ) {
    return NextResponse.next();
  }

  // 2) Om sidan inte är skyddad — gå vidare utan auth-kontroll
  const path = nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));
  if (!isProtected) {
    return NextResponse.next();
  }

  // 3) För skyddade sidor: skapa ett svar-objekt som Supabase kan sätta cookies på
  const res = NextResponse.next();

  // 4) Skapa server-klient med cookie-adapter (Edge-säker)
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll().map(({ name, value }) => ({ name, value })),
      setAll: async (cookies) => {
        for (const { name, value, options } of cookies) {
          res.cookies.set(name, value, options ? { ...options } : undefined);
        }
      },
    },
  });

  // 5) Kolla om det finns en inloggad user
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } as any }));

  if (!user) {
    // Skicka oinloggad till /login och bevara redirect-mål
    const redirect = new URL("/login", nextUrl.origin);
    redirect.searchParams.set("next", path + nextUrl.search);
    return NextResponse.redirect(redirect);
  }

  // 6) Enkel admin-gate (om /admin)
  if (path.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null }>();

    if (profile?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", nextUrl.origin));
    }
  }

  // 7) Allt ok — släpp igenom
  return res;
}

// 8) Kör middleware på “allt” utom statics + våra öppna rutter (extra säkert)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|login|auth/callback).*)",
  ],
};
