import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { getSupabaseServer } from "@/lib/supabase/serverClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { markRead } from "@/app/nyheter/actions";

export default async function NewsDetail({ params }: { params: { slug: string } }) {
  const supabase = getSupabaseServer();
  const { data: news } = await supabase.from("news_items").select("*").eq("slug", params.slug).maybeSingle();
  if (!news) return notFound();

  await markRead(news.id);
  const published = new Date(news.published_at).toLocaleString("sv-SE", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <article className="space-y-6">
      <header className="space-y-4">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Nyhet</span>
        <h1>{news.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <span>{published}</span>
          {news.pinned ? <Badge variant="info">Pinnad</Badge> : null}
          {(news.categories ?? []).map((c: string) => (
            <Badge key={c}>{c}</Badge>
          ))}
        </div>
        <Link href="/nyheter" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
          Tillbaka till nyheter
        </Link>
      </header>
      <Card className="border border-surface-border/80 bg-white/90 p-0 dark:border-surface-dark-border/60 dark:bg-neutral-900/80">
        <CardContent className="prose max-w-none space-y-6 p-8 text-neutral-700 prose-headings:font-semibold dark:text-neutral-200">
          <ReactMarkdown>{news.content}</ReactMarkdown>
        </CardContent>
      </Card>
    </article>
  );
}
