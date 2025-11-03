import {
  createServerClient,
  type CookieOptions,
  type CookieMethodsServer,
  type SetAllCookies,
} from "@supabase/ssr";
import { cookies, headers } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let hasWarnedReadonly = false;

function warnReadonlyCookies() {
  if (process.env.NODE_ENV !== "production" && !hasWarnedReadonly) {
    console.warn(
      "[supabase] Unable to mutate cookies in this context. Session persistence may be skipped.",
    );
    hasWarnedReadonly = true;
  }
}

function tryMutateCookies<T extends any[]>(
  action: (store: ReturnType<typeof cookies>, ...args: T) => void,
) {
  return (...args: T) => {
    const store = cookies();

    try {
      action(store, ...args);
    } catch (error) {
      warnReadonlyCookies();
    }
  };
}

export function getSupabaseServer() {
  const cookieStore = cookies();
  const headerStore = headers();

  const cookieAdapter = {
    getAll() {
      return cookieStore.getAll().map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
      }));
    },
    setAll: tryMutateCookies<Parameters<SetAllCookies>>((store, cookiesToSet) => {
      const mutableStore = store as unknown as {
        set?: (cookie: { name: string; value: string } & CookieOptions) => void;
      };

      if (typeof mutableStore.set !== "function") {
        warnReadonlyCookies();
        return;
      }

      for (const { name, value, options } of cookiesToSet) {
        mutableStore.set({ name, value, ...options });
      }
    }),
  } satisfies CookieMethodsServer;

  const headerEntries = Object.fromEntries(headerStore.entries()) as Record<string, string>;

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: cookieAdapter,
    global: {
      headers: headerEntries,
    },
  });
}
