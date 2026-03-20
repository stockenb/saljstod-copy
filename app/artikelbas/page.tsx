"use client";

import Image, { StaticImageData } from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import {
  type PackagingFilterValue,
  PACKAGING_FILTER_VALUES,
} from "@/lib/artikelbas-filters";
import bulkImage from "./images/bulk.png";
import packageImage from "./images/paket.png";
import smallPackImage from "./images/sbpack.png";
import bucketImage from "./images/storhink.png";

const PACKAGING_FILTER_MEDIA: Record<PackagingFilterValue, { label: string; image: StaticImageData }> = {
  "small-pack": { label: "Småpack", image: smallPackImage },
  bucket: { label: "Hink", image: bucketImage },
  package: { label: "Paket", image: packageImage },
  bulk: { label: "Bulk", image: bulkImage },
};

const PACKAGING_FILTER_OPTIONS = PACKAGING_FILTER_VALUES.map((value) => ({
  value,
  ...PACKAGING_FILTER_MEDIA[value],
}));

type FamilyArticle = {
  articleNumber: string;
  title: string;
  link: string;
};

type FetchStatus = "idle" | "loading" | "success" | "error";

export default function ArtikelbasPage() {
  const [query, setQuery] = useState("");
  const [packagingFilters, setPackagingFilters] = useState<PackagingFilterValue[]>([]);
  const [articles, setArticles] = useState<FamilyArticle[]>([]);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      setStatus("error");
      setMessage("Ange en söktext.");
      setArticles([]);
      return;
    }

    setStatus("loading");
    setMessage("Söker i artikelbasen...");

    try {
      const params = new URLSearchParams();
      params.set("q", trimmed);
      PACKAGING_FILTER_VALUES.forEach((filter) => {
        if (packagingFilters.includes(filter)) {
          params.append("packaging", filter);
        }
      });

      const response = await fetch(`/api/artikelbas/family?${params.toString()}`);

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Kunde inte hämta artiklar.");
      }

      const data = (await response.json()) as { articles: FamilyArticle[] };
      setArticles(data.articles);

      const count = data.articles.length;
      setStatus("success");
      setMessage(
        count === 0
          ? "Inga artiklar hittades."
          : `Hittade ${count} artikel${count === 1 ? "" : "ar"}.`
      );
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Ett oväntat fel inträffade.");
    }
  };

  const handleCreateProductSheet = () => {
    if (articles.length === 0) return;
    const params = new URLSearchParams();
    params.set("artiklar", articles.map((a) => a.articleNumber).join(","));
    router.push(`/produktblad/samlat?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-violet-400 uppercase">
          Verktyg
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-100" style={{ letterSpacing: "-0.02em" }}>
          Artikelbas
        </h1>
        <p className="mt-2 text-sm text-gray-300">
          Sök fram en produktfamilj och skapa ett samlat produktblad för alla matchande artiklar.
        </p>
      </div>

      {/* ── Söksektion ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.30] bg-white/[0.16] p-6 space-y-6">

        <form onSubmit={handleSearch} className="space-y-6">

          {/* Sökfält */}
          <div className="space-y-2">
            <label htmlFor="artikelbas-query" className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
              Sök produktfamilj
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                id="artikelbas-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Exempel: %T-Bite%"
                className="w-full rounded-xl border border-white/[0.32] bg-white/[0.16] py-3 pl-11 pr-4 text-sm text-gray-200 placeholder-gray-500 outline-none transition-all focus:border-violet-500/50 focus:bg-white/[0.12] focus:ring-1 focus:ring-violet-500/30"
              />
            </div>
          </div>

          {/* Förpackningsfilter */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400">
              Filtrera förpackningstyp
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PACKAGING_FILTER_OPTIONS.map((option) => {
                const isChecked = packagingFilters.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isChecked}
                    onClick={() =>
                      setPackagingFilters((cur) =>
                        cur.includes(option.value)
                          ? cur.filter((v) => v !== option.value)
                          : [...cur, option.value]
                      )
                    }
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium transition-all duration-200 ${
                      isChecked
                        ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
                        : "border-white/[0.30] bg-white/[0.16] text-gray-300 hover:border-white/[0.25] hover:bg-white/[0.13] hover:text-gray-200"
                    }`}
                  >
                    {isChecked && (
                      <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-violet-400" />
                    )}
                    <div className="h-12 w-12 overflow-hidden p-1">
                      <Image
                        src={option.image}
                        alt={option.label}
                        className="h-full w-full object-contain brightness-90"
                        sizes="48px"
                        priority
                      />
                    </div>
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit + status */}
          <div className="flex items-center justify-between gap-4">
            {message ? (
              <div className="flex items-center gap-2">
                {status === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                {status === "error" && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                {status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                <p className={`text-xs ${
                  status === "error" ? "text-red-400" :
                  status === "success" ? "text-emerald-400" : "text-gray-400"
                }`}>
                  {message}
                </p>
              </div>
            ) : <div />}

            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Sök artiklar
            </button>
          </div>
        </form>
      </div>

      {/* ── Träfflista ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-100" style={{ letterSpacing: "-0.01em" }}>
              Träfflista
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {articles.length === 0
                ? "Sök efter en produktfamilj för att se artiklar här."
                : `${articles.length} artikel${articles.length === 1 ? "" : "ar"} matchar sökningen.`}
            </p>
          </div>

          {articles.length > 0 && (
            <button
              type="button"
              onClick={handleCreateProductSheet}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.32] bg-white/[0.16] px-4 py-2 text-xs font-semibold text-gray-300 transition-all duration-200 hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200"
            >
              <FileText className="h-3.5 w-3.5" />
              Skapa samlat produktblad
            </button>
          )}
        </div>

        {articles.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/[0.30] py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.30] bg-white/[0.16] text-gray-500">
              <Search className="h-5 w-5" />
            </div>
            <p className="text-sm text-gray-500">Inga artiklar att visa ännu.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.30]">
            {articles.map((article, i) => (
              <div
                key={article.articleNumber}
                className={`flex items-center gap-5 px-5 py-4 transition-colors hover:bg-white/[0.16] ${
                  i !== articles.length - 1 ? "border-b border-white/[0.30]" : ""
                }`}
              >
                {/* Nummer */}
                <div className="shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Art.nr</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-violet-300">
                    {article.articleNumber}
                  </p>
                </div>

                {/* Separator */}
                <div className="h-8 w-px bg-white/[0.16]" />

                {/* Titel */}
                <p className="flex-1 text-sm text-gray-300">{article.title}</p>

                {/* Arrow */}
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
