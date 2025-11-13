"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type PackagingFilterValue,
  PACKAGING_FILTER_VALUES,
} from "@/lib/artikelbas-filters";

const PACKAGING_FILTER_LABELS: Record<PackagingFilterValue, string> = {
  "small-pack": "Småpack",
  bucket: "Hink",
  package: "Paket",
  bulk: "Bulk",
};

const PACKAGING_FILTER_OPTIONS = PACKAGING_FILTER_VALUES.map((value) => ({
  value,
  label: PACKAGING_FILTER_LABELS[value],
}));

type FamilyArticle = {
  articleNumber: string;
  title: string;
  link: string;
};

type FetchStatus = "idle" | "loading" | "success" | "error";
export default function ArtikelbasPage() {
  const [query, setQuery] = useState("");
  const [excludeBulk, setExcludeBulk] = useState(false);
  const [packagingFilters, setPackagingFilters] = useState<PackagingFilterValue[]>([]);
  const [articles, setArticles] = useState<FamilyArticle[]>([]);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const messageClasses = useMemo(() => {
    switch (status) {
      case "error":
        return "text-sm text-danger";
      case "success":
        return "text-sm text-emerald-600";
      case "loading":
        return "text-sm text-neutral-500";
      default:
        return "text-sm text-neutral-500";
    }
  }, [status]);

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
      if (excludeBulk) {
        params.set("excludeBulk", "1");
      }
      PACKAGING_FILTER_VALUES.forEach((filter) => {
        if (packagingFilters.includes(filter)) {
          params.append("packaging", filter);
        }
      });

      const response = await fetch(`/api/artikelbas/family?${params.toString()}`, {
        method: "GET",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || "Kunde inte hämta artiklar.");
      }

      const data = (await response.json()) as { articles: FamilyArticle[] };
      setArticles(data.articles);

      if (data.articles.length === 0) {
        setStatus("success");
        setMessage("Inga artiklar hittades.");
      } else {
        const count = data.articles.length;
        setStatus("success");
        setMessage(`Hittade ${count} artikel${count === 1 ? "" : "ar"}.`);
      }
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Ett oväntat fel inträffade.",
      );
    }
  };

  const handleCreateProductSheet = () => {
    if (articles.length === 0) {
      return;
    }

    const articleNumbers = articles.map((article) => article.articleNumber);
    const params = new URLSearchParams();
    params.set("artiklar", articleNumbers.join(","));

    router.push(`/produktblad/samlat?${params.toString()}`);
  };

  return (
    <div className="space-y-10">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Artikelbas
        </h1>
        <p className="text-sm text-neutral-600">
          Sök fram en produktfamilj och skapa ett samlat produktblad för alla
          matchande artiklar.
        </p>
      </div>

      <section className="space-y-6 rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col gap-2">
            <label
              className="text-sm font-medium text-neutral-700"
              htmlFor="artikelbas-query"
            >
              Sök produktfamilj
            </label>
            <Input
              id="artikelbas-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Exempel: %T-Bite%"
            />
          </div>

          <div className="space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-neutral-700">
                Ta endast med följande:
              </legend>
              <div className="flex flex-wrap gap-3">
                {PACKAGING_FILTER_OPTIONS.map((option) => {
                  const inputId = `artikelbas-packaging-${option.value}`;
                  const isChecked = packagingFilters.includes(option.value);

                  return (
                    <label
                      key={option.value}
                      htmlFor={inputId}
                      className="flex items-center gap-2 text-sm text-neutral-700"
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        className="h-4 w-4 rounded border border-neutral-300 text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                        checked={isChecked}
                        onChange={(event) => {
                          const { checked } = event.target;
                          setPackagingFilters((current) => {
                            if (checked) {
                              if (current.includes(option.value)) {
                                return current;
                              }

                              return [...current, option.value];
                            }

                            return current.filter((value) => value !== option.value);
                          });
                        }}
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button type="submit" className="w-full sm:w-auto">
              Sök artiklar
            </Button>
          </div>
        </form>
        {message ? <p className={messageClasses}>{message}</p> : null}
      </section>

      <section className="space-y-4 rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">
              Träfflista
            </h2>
            <p className="text-sm text-neutral-600">
              {articles.length === 0
                ? "Sök efter en produktfamilj för att se artiklar här."
                : "Alla artiklar som matchar din sökning."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCreateProductSheet}
              disabled={articles.length === 0}
              className="w-full sm:w-auto"
            >
              Skapa samlat produktblad
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {articles.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Inga artiklar att visa ännu.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white/80">
              {articles.map((article) => (
                <li key={article.articleNumber} className="p-4">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Artikelnummer
                  </p>
                  <p className="text-base font-semibold text-neutral-900">
                    {article.articleNumber}
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">{article.title}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
