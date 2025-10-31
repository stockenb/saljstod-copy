import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

const normalizeCookieOptions = (options: CookieOptions) =>
  options ? { ...options } : undefined;

export function getSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () =>
        cookieStore.getAll().map(({ name, value }) => ({ name, value })),
      setAll: async (cookies) => {
        try {
          for (const { name, value, options } of cookies) {
            cookieStore.set(name, value, normalizeCookieOptions(options));
          }
        } catch (error) {
          console.warn("Failed to persist Supabase auth cookies", error);
        }
      },
    },
  });
}
