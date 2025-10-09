"use server";

import { revalidatePath } from "next/cache";
import { createServerClientSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

export async function markRead(news_id: string) {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("news_reads").upsert({ user_id: user.id, news_id });
  await logAudit("READ", "news_items", news_id);
}

export async function upsertNews(formData: FormData) {
  const supabase = createServerClientSupabase();
  const id = String(formData.get("id") || "");
  const payload: any = {
    slug: String(formData.get("slug") || ""),
    title: String(formData.get("title") || ""),
    content: String(formData.get("content") || ""),
    categories: (String(formData.get("categories") || "").split(",").map((t) => t.trim()).filter(Boolean)) as any,
    pinned: String(formData.get("pinned") || "") === "on",
  };
  const { data: { user } } = await supabase.auth.getUser();
  if (user) payload.author_id = user.id;
  if (id) {
    await supabase.from("news_items").update(payload).eq("id", id);
    await logAudit("UPDATE", "news_items", id);
  } else {
    const { data } = await supabase.from("news_items").insert(payload).select("id").single();
    await logAudit("CREATE", "news_items", data?.id);
  }
  revalidatePath("/nyheter");
  revalidatePath("/admin/nyheter");
}

export async function deleteNews(id: string) {
  const supabase = createServerClientSupabase();
  await supabase.from("news_items").delete().eq("id", id);
  await logAudit("DELETE", "news_items", id);
  revalidatePath("/nyheter");
  revalidatePath("/admin/nyheter");
}
