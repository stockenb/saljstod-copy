"use server";

// TODO: Reintroduce audit logging when Supabase returns.
export async function logAudit(_action: string, _entity: string, _entityId?: string | null) {
  return;
}
