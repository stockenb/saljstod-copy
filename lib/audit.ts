"use server";

import { createServerClientSupabase } from "./supabase/server";

export async function logAudit(action: string, entity: string, entity_id?: string | null) {
  try {
    const supabase = createServerClientSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      user_id: user?.id ?? null,
      action,
      entity,
      entity_id: entity_id ?? null,
    });
  } catch (e) {
    // no-op
  }
}
