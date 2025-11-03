import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export function getSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options?: CookieOptions) {
        cookieStore.set({ name, value, ...(options ?? {}) });
      },
      remove(name, options?: CookieOptions) {
        cookieStore.set({
          name,
          value: "",
          ...(options ?? {}),
          expires: new Date(0),
        });
      },
    },
  });
}
