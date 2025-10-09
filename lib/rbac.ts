import { createServerClientSupabase } from "./supabase/server";

export async function getProfile() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data;
}

export async function requireAdmin() {
  const profile = await getProfile();
  return profile?.role === "ADMIN";
}
