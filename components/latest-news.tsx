"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Pin } from "lucide-react";
import { getNews, NewsItem } from "@/lib/news-store";
import { cn } from "@/lib/utils";

const categoryStyle: Record<string, string> = {
  Produkter: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  System: "border-purple-500/20 bg-purple-500/10 text-purple-300",
  Kampanj: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  Övrigt: "border-white/[0.22]0 bg-white/[0.09] text-gray-400",
};

export function LatestNews() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    setNews(getNews().slice(0, 3));
  }, []);

  if (news.length === 0) return null;

  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-gray-100">
            Senaste nytt
          </h2>
          <span className="text-sm text-gray-400">{news.length} inlägg</span>
        </div>
        <Link
          href="/nyheter"
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.16] bg-white/[0.09] px-3 py-1.5 text-[12px] font-medium text-gray-300 no-underline transition-all hover:border-white/[0.25] hover:text-gray-200"
        >
          Visa alla
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((item) => (
          <Link
            key={item.id}
            href={`/nyheter/${item.slug}`}
            className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.16] bg-white/[0.09] p-5 no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.25] hover:bg-white/[0.13]"
          >
            {/* Pinned indicator */}
            {item.pinned && (
              <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                <Pin className="h-2.5 w-2.5" />
                Fäst
              </div>
            )}

            {/* Category */}
            <span
              className={cn(
                "w-fit rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                categoryStyle[item.category] ?? categoryStyle["Övrigt"]
              )}
            >
              {item.category}
            </span>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-sm font-semibold leading-snug text-gray-200 transition-colors duration-200 group-hover:text-white">
                {item.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-400">
                {item.excerpt}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/[0.16] pt-3">
              <span className="text-[11px] text-gray-400">{item.author}</span>
              <span className="text-xs font-medium text-gray-300">
                {new Date(item.date).toLocaleDateString("sv-SE", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
