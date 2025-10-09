import { notFound } from "next/navigation";
import { createServerClientSupabase } from "@/lib/supabase/server";
import ReactMarkdown from "react-markdown";
import { markRead } from "@/app/nyheter/actions";

export default async function NewsDetail({ params }: { params: { slug: string } }) {
  const supabase = createServerClientSupabase();
  const { data: news } = await supabase.from("news_items").select("*").eq("slug", params.slug).maybeSingle();
  if (!news) return notFound();

  await markRead(news.id);

  return (
    <article className="prose max-w-none prose-headings:font-semibold">
      <h1 className="text-3xl font-semibold">{news.title}</h1>
      <div className="text-sm text-neutral-500">{new Date(news.published_at).toLocaleString("sv-SE")}</div>
      <div className="mt-6">
        <ReactMarkdown>{news.content}</ReactMarkdown>
      </div>
    </article>
  );
}
