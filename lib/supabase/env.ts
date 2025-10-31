const DEFAULT_SUPABASE_URL = "https://itttmlxdlmtoiiwhxzfy.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0dHRtbHhkbG10b2lpd2h4emZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5OTAzMzYsImV4cCI6MjA3NTU2NjMzNn0.F3ZagXHxlR-1f51CVBT3j5GSIBB148oUbSCYgUfXX84";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  DEFAULT_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error(
    "Missing environment variable NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)"
  );
}

if (supabaseUrl === DEFAULT_SUPABASE_URL) {
  console.warn(
    "[env] NEXT_PUBLIC_SUPABASE_URL missing. Falling back to repository default."
  );
}

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  DEFAULT_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error(
    "Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)"
  );
}

if (supabaseAnonKey === DEFAULT_SUPABASE_ANON_KEY) {
  console.warn(
    "[env] NEXT_PUBLIC_SUPABASE_ANON_KEY missing. Falling back to repository default."
  );
}

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;
