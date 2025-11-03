"use server";

// TODO: Reintroduce Supabase-backed news actions when auth/db is added back.
export async function markRead(_newsId: string) {
  return;
}

export async function upsertNews(_formData: FormData) {
  throw new Error("News administration är inaktiverad tills Supabase återinförs.");
}

export async function deleteNews(_id: string) {
  throw new Error("News administration är inaktiverad tills Supabase återinförs.");
}
