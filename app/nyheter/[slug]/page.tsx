"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, User, Pin } from "lucide-react";
import { getNews, NewsItem } from "@/lib/news-store";
import { cn } from "@/lib/utils";

const categoryConfig: Record<string, { dot: string; pill: string }> = {
  Produkter: {
    dot: "bg-blue-400",
    pill: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  },
  System: {
    dot: "bg-purple-400",
    pill: "border-purple-500/20 bg-purple-500/10 text-purple-300",
  },
  Kampanj: {
    dot: "bg-orange-400",
    pill: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  },
  Övrigt: {
    dot: "bg-gray-500",
    pill: "border-white/[0.22]0 bg-white/[0.09] text-gray-400",
  },
};

export default function NewsDetail({ params }: { params: { slug: string } }) {
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const news = getNews();
    const found = news.find((n) => n.slug === params.slug) ?? null;
    setItem(found);
    setLoading(false);
  }, [params.slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/[0.22]0 border-t-violet-400" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-6">
        <Link
          href="/nyheter"
          className="inline-flex items-center gap-2 text-sm text-gray-400 no-underline transition-colors hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till nyheter
        </Link>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/[0.22]0 py-20 text-center">
          <p className="text-sm text-gray-500">Nyheten hittades inte.</p>
        </div>
      </div>
    );
  }

  const cfg = categoryConfig[item.category] ?? categoryConfig["Övrigt"];
  const paragraphs = item.content.split("\n");

  return (
    <article className="mx-auto max-w-2xl space-y-8 py-2">
      {/* ── Back link ─────────────────────────────────── */}
      <Link
        href="/nyheter"
        className="inline-flex items-center gap-2 text-sm text-gray-400 no-underline transition-all duration-200 hover:text-gray-200 hover:-translate-x-0.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Nyheter
      </Link>

      {/* ── Article header ────────────────────────────── */}
      <header className="space-y-5">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {item.pinned && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-violet-300 uppercase">
              <Pin className="h-2.5 w-2.5" />
              Fäst
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              cfg.pill
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
            {item.category}
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-3xl font-black text-gray-100"
          style={{ letterSpacing: "-0.02em" }}
        >
          {item.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-gray-500" />
            {item.author}
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            {new Date(item.date).toLocaleDateString("sv-SE", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Excerpt / lead */}
        {item.excerpt && (
          <p className="border-l-2 border-violet-500/40 pl-4 text-sm font-medium leading-relaxed text-gray-400">
            {item.excerpt}
          </p>
        )}
      </header>

      {/* ── Article body ──────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.16] bg-white/[0.09] p-7">
        <div className="space-y-4 text-sm leading-relaxed text-gray-300">
          {paragraphs.map((line, i) =>
            line.trim() === "" ? (
              <div key={i} className="h-1" />
            ) : (
              <p key={i} className="text-gray-300">
                {line}
              </p>
            )
          )}
        </div>
      </div>

      {/* ── Footer nav ────────────────────────────────── */}
      <div className="border-t border-white/[0.16] pt-6">
        <Link
          href="/nyheter"
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.16] bg-white/[0.09] px-4 py-2.5 text-sm font-medium text-gray-300 no-underline transition-all duration-200 hover:border-white/[0.25] hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till alla nyheter
        </Link>
      </div>
    </article>
  );
}
