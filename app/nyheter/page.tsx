import Link from "next/link";
import { createServerClientSupabase } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function NewsListPage() {
  const supabase = createServerClientSupabase();
  const { data: news } = await supabase
    .from("news_items")
    .select("id,slug,title,categories,pinned,published_at")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nyheter</h1>
      <div className="space-y-3">
        {news?.map((n) => (
          <div key={n.id} className="card p-4 flex items-center justify-between">
            <div>
              <Link className="font-medium hover:underline" href={"/nyheter/" + n.slug}>{n.title}</Link>
              <div className="mt-1 flex gap-2">{(n.categories ?? []).map((c: string) => <Badge key={c}>{c}</Badge>)}</div>
            </div>
            <div className="text-xs text-neutral-500">
              {n.pinned ? <span className="mr-2 text-primary font-medium">Pinnad</span> : null}
              {formatDate(n.published_at)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
