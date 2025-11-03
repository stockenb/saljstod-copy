// lib/supabase/env.ts
function mustGet(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[env] Missing required env var: ${name}`);
  }
  return v;
}

// Publikt (används i browsern)
export const NEXT_PUBLIC_SUPABASE_URL = mustGet("NEXT_PUBLIC_SUPABASE_URL");
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = mustGet("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Server (återanvänd publika om separata saknas)
export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? NEXT_PUBLIC_SUPABASE_ANON_KEY;
