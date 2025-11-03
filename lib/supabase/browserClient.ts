import { createClient } from "@supabase/supabase-js";

import {
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
} from "./env";

export const supabaseBrowser = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: { persistSession: true, autoRefreshToken: true },
  }
);
