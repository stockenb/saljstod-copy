export default function Page() {
  const checks = [
    ["NEXT_PUBLIC_SUPABASE_URL", !!process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
    ["SUPABASE_URL", !!process.env.SUPABASE_URL],
    ["SUPABASE_SERVICE_ROLE", !!process.env.SUPABASE_SERVICE_ROLE],
  ];
  return <pre>{checks.map(([k, ok]) => `${k}: ${ok ? "SET" : "MISSING"}`).join("\n")}</pre>;
}
