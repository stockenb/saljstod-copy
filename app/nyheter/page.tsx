import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { createServerClientSupabase } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function NewsListPage() {
  const supabase = createServerClientSupabase();
  const { data: news } = await supabase
    .from("news_items")
    .select("id,slug,title,categories,pinned,published_at")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false });

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Aktuellt</span>
        <h1>Nyheter</h1>
        <p className="max-w-2xl text-sm text-neutral-500">
          Få en snabb överblick över vad som händer just nu. Filtrera med kategorierna för att hitta rätt information.
        </p>
      </header>
      <div className="grid gap-4">
        {news?.map((n) => (
          <Card key={n.id} className="border border-surface-border/80 bg-white/90 p-0 transition duration-calm ease-calm hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover dark:border-surface-dark-border/60 dark:bg-neutral-900/80">
            <CardContent className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  {n.pinned ? <Badge variant="info">Pinnad</Badge> : null}
                  {(n.categories ?? []).map((c: string) => (
                    <Badge key={c}>{c}</Badge>
                  ))}
                </div>
                <Link className="text-lg font-semibold leading-snug text-neutral-900 hover:text-primary hover:underline dark:text-white" href={"/nyheter/" + n.slug}>
                  {n.title}
                </Link>
              </div>
              <div className="flex flex-col items-start gap-3 text-xs text-neutral-500 sm:flex-row sm:items-center sm:gap-4">
                <span>{formatDate(n.published_at)}</span>
                <Link
                  href={"/nyheter/" + n.slug}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  Läs mer
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
