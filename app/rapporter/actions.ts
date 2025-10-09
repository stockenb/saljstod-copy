"use server";

import { revalidatePath } from "next/cache";
import { createServerClientSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function createReport(formData: FormData) {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Inte inloggad");

  const payload = {
    owner_id: user.id,
    title: String(formData.get("title") || ""),
    customer: String(formData.get("customer") || ""),
    location: String(formData.get("location") || ""),
    visit_date: new Date(String(formData.get("visit_date") || new Date().toISOString())),
    attendees: String(formData.get("attendees") || ""),
    notes: String(formData.get("notes") || ""),
    status: String(formData.get("status") || "Öppet"),
    next_step: String(formData.get("next_step") || ""),
    next_step_due: formData.get("next_step_due") ? String(formData.get("next_step_due")) : null,
    tags: (String(formData.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean)) as any,
  };

  const { data, error } = await supabase.from("visit_reports").insert(payload).select("id").single();
  if (error) throw error;
  await logAudit("CREATE", "visit_reports", data.id);
  revalidatePath("/rapporter");
  return data;
}

export async function updateReport(id: string, formData: FormData) {
  const supabase = createServerClientSupabase();
  const payload: any = {
    title: String(formData.get("title") || ""),
    customer: String(formData.get("customer") || ""),
    location: String(formData.get("location") || ""),
    visit_date: new Date(String(formData.get("visit_date") || new Date().toISOString())),
    attendees: String(formData.get("attendees") || ""),
    notes: String(formData.get("notes") || ""),
    status: String(formData.get("status") || "Öppet"),
    next_step: String(formData.get("next_step") || ""),
    next_step_due: formData.get("next_step_due") ? String(formData.get("next_step_due")) : null,
    updated_at: new Date(),
    tags: (String(formData.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean)) as any,
  };
  const { error } = await supabase.from("visit_reports").update(payload).eq("id", id);
  if (error) throw error;
  await logAudit("UPDATE", "visit_reports", id);
  revalidatePath(`/rapporter/${id}`);
  revalidatePath("/rapporter");
}

export async function deleteReport(id: string) {
  const supabase = createServerClientSupabase();
  const { error } = await supabase.from("visit_reports").delete().eq("id", id);
  if (error) throw error;
  await logAudit("DELETE", "visit_reports", id);
  revalidatePath("/rapporter");
}

export async function completeFollowUp(id: string) {
  const supabase = createServerClientSupabase();
  const { error } = await supabase.from("visit_reports").update({ next_step_due: null }).eq("id", id);
  if (error) throw error;
  await logAudit("FOLLOWUP_COMPLETED", "visit_reports", id);
  revalidatePath(`/rapporter/${id}`);
}

export async function exportReportsToCSV(searchParams: string) {
  // No-op on server; handled client-side for download convenience
  return searchParams;
}
