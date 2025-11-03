import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let hasWarnedReadonly = false;

function tryMutateCookies<T extends any[]>(
  action: (store: ReturnType<typeof cookies>, ...args: T) => void
) {
  return (...args: T) => {
    const store = cookies();
    try {
      action(store, ...args);
    } catch (error) {
      if (process.env.NODE_ENV !== "production" && !hasWarnedReadonly) {
        console.warn("[supabase] Unable to mutate cookies in this context. Session persistence may be skipped.");
        hasWarnedReadonly = true;
      }
    }
  };
}

export function getSupabaseServer() {
  const cookieStore = cookies();
  const headerStore = headers();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll: tryMutateCookies<[
        {
          name: string;
          value: string;
          options: CookieOptions;
        }[]
      ]>((store, cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          (store as any).set?.({ name, value, ...options });
        });
      }),
    },
    headers: {
      get(name: string) {
        return headerStore.get(name) ?? undefined;
      },
    },
  });
}
