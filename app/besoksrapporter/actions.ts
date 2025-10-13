"use server";

import { revalidatePath } from "next/cache";

import { createServerClientSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

function payloadFromForm(formData: FormData) {
  return {
    name: String(formData.get("name") || ""),
    org_number: formData.get("org_number") ? String(formData.get("org_number")) : null,
    address_line: formData.get("address_line") ? String(formData.get("address_line")) : null,
    postal_code: formData.get("postal_code") ? String(formData.get("postal_code")) : null,
    city: formData.get("city") ? String(formData.get("city")) : null,
    email: formData.get("email") ? String(formData.get("email")) : null,
    phone: formData.get("phone") ? String(formData.get("phone")) : null,
    notes: formData.get("notes") ? String(formData.get("notes")) : null,
    updated_at: new Date(),
  };
}

function contactPayloadFromForm(formData: FormData) {
  return {
    name: String(formData.get("name") || ""),
    role: formData.get("role") ? String(formData.get("role")) : null,
    email: formData.get("email") ? String(formData.get("email")) : null,
    phone: formData.get("phone") ? String(formData.get("phone")) : null,
    updated_at: new Date(),
  };
}

export async function createCustomer(formData: FormData) {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Inte inloggad");

  const payload = {
    owner_id: user.id,
    ...payloadFromForm(formData),
  };

  const { data, error } = await supabase.from("customers").insert(payload).select("id").single();
  if (error) throw error;
  await logAudit("CREATE", "customers", data.id);
  revalidatePath("/besoksrapporter");
  return data;
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = createServerClientSupabase();
  const payload = payloadFromForm(formData);
  const { error } = await supabase.from("customers").update(payload).eq("id", id);
  if (error) throw error;
  await logAudit("UPDATE", "customers", id);
  revalidatePath(`/besoksrapporter/${id}`);
  revalidatePath("/besoksrapporter");
}

export async function deleteCustomer(id: string) {
  const supabase = createServerClientSupabase();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
  await logAudit("DELETE", "customers", id);
  revalidatePath("/besoksrapporter");
}

export async function createCustomerContact(customerId: string, formData: FormData) {
  const supabase = createServerClientSupabase();
  const payload = {
    customer_id: customerId,
    ...contactPayloadFromForm(formData),
  };
  const { data, error } = await supabase.from("customer_contacts").insert(payload).select("id").single();
  if (error) throw error;
  await logAudit("CREATE", "customer_contacts", data.id);
  revalidatePath(`/besoksrapporter/${customerId}`);
}

export async function updateCustomerContact(customerId: string, contactId: string, formData: FormData) {
  const supabase = createServerClientSupabase();
  const payload = contactPayloadFromForm(formData);
  const { error } = await supabase.from("customer_contacts").update(payload).eq("id", contactId);
  if (error) throw error;
  await logAudit("UPDATE", "customer_contacts", contactId);
  revalidatePath(`/besoksrapporter/${customerId}`);
}

export async function deleteCustomerContact(customerId: string, contactId: string) {
  const supabase = createServerClientSupabase();
  const { error } = await supabase.from("customer_contacts").delete().eq("id", contactId);
  if (error) throw error;
  await logAudit("DELETE", "customer_contacts", contactId);
  revalidatePath(`/besoksrapporter/${customerId}`);
}
