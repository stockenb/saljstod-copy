function mustGet(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[env] Missing required env var: ${name}`);
  }
  return value;
}

export const NEXT_PUBLIC_SUPABASE_URL = mustGet("NEXT_PUBLIC_SUPABASE_URL");
export const NEXT_PUBLIC_SUPABASE_ANON_KEY = mustGet(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
);

export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? NEXT_PUBLIC_SUPABASE_ANON_KEY;
