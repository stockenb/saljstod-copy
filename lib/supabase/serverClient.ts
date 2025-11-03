import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let hasWarnedReadonly = false;

function tryMutateCookies(
  action: (store: ReturnType<typeof cookies>, name: string, value?: string, options?: CookieOptions) => void
) {
  return (name: string, value?: string, options?: CookieOptions) => {
    const store = cookies();
    try {
      action(store, name, value, options);
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
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set: tryMutateCookies((store, name, value = "", options) => {
        (store as any).set?.({ name, value, ...(options ?? {}) });
      }),
      remove: tryMutateCookies((store, name, _value, options) => {
        (store as any).set?.({ name, value: "", ...(options ?? {}) });
      }),
    },
    headers: {
      get(name: string) {
        return headerStore.get(name) ?? undefined;
      },
    },
  });
}
