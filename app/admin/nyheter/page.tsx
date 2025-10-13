import { createServerClientSupabase } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteNews, upsertNews } from "@/app/nyheter/actions";

export default async function AdminNewsPage() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("*").eq("id", user.id).single() : { data: null };
  if (profile?.role !== "ADMIN") return notFound();

  const { data: items } = await supabase.from("news_items").select("*").order("created_at", { ascending: false });

  async function action(formData: FormData) {
    "use server";
    await upsertNews(formData);
  }

  async function del(formData: FormData) {
    "use server";
    const id = String(formData.get("id") || "");
    await deleteNews(id);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <section>
        <h1 className="text-2xl font-semibold mb-4">Nyhet (skapa/uppdatera)</h1>
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" />
          <label className="block space-y-1">
            <span className="text-sm">Slug (valfritt)</span>
            <Input name="slug" placeholder="unik-slug" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Titel</span>
            <Input name="title" placeholder="Titel" required />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Kategorier (komma-separerade)</span>
            <Input name="categories" placeholder="uppdatering, release" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="pinned" className="size-4" />
            <span className="text-sm">Pinna</span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Innehåll (Markdown)</span>
            <Textarea name="content" placeholder="**Hej!** Detta är en nyhet..." />
          </label>
          <Button type="submit">Spara</Button>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Befintliga nyheter</h2>
        <div className="space-y-3">
          {items?.map((i) => (
            <div key={i.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-neutral-500">{i.slug}</div>
                </div>
                <form action={del}>
                  <input type="hidden" name="id" value={i.id} />
                  <Button variant="destructive">Ta bort</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
