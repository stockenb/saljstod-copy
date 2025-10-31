"use server";

import { getSupabaseServer } from "./supabase/serverClient";

export async function logAudit(action: string, entity: string, entity_id?: string | null) {
  try {
    const supabase = getSupabaseServer();
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
