"use client";

import { useEffect, useState } from "react";
import { Newspaper, Plus, Trash2, Shield, User, Pin, LogOut } from "lucide-react";
import {
  getNews,
  addNewsItem,
  deleteNewsItem,
  NewsItem,
  NewsCategory,
} from "@/lib/news-store";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

const CATEGORIES: NewsCategory[] = ["Produkter", "System", "Kampanj", "Övrigt"];

const categoryDot: Record<string, string> = {
  Produkter: "bg-sky-400",
  System: "bg-violet-400",
  Kampanj: "bg-amber-400",
  Övrigt: "bg-gray-500",
};

const categoryText: Record<string, string> = {
  Produkter: "text-sky-300",
  System: "text-violet-300",
  Kampanj: "text-amber-300",
  Övrigt: "text-gray-400",
};

export default function ProfilePage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const { name, isAdmin: admin, user } = useAuth();
  const email = user?.email || "";

  // Nyhetsformulär
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formExcerpt, setFormExcerpt] = useState("");
  const [formCategory, setFormCategory] = useState<NewsCategory>("Övrigt");
  const [formPinned, setFormPinned] = useState(false);

  useEffect(() => {
    setNews(getNews());
  }, []);

  function handleCreateNews(e: React.FormEvent) {
    e.preventDefault();
    addNewsItem({
      title: formTitle,
      content: formContent,
      excerpt: formExcerpt || formContent.slice(0, 120),
      author: name,
      category: formCategory,
      date: new Date().toISOString().split("T")[0],
      pinned: formPinned,
    });
    setNews(getNews());
    setShowForm(false);
    setFormTitle("");
    setFormContent("");
    setFormExcerpt("");
    setFormCategory("Övrigt");
    setFormPinned(false);
  }

  function handleDelete(id: string) {
    deleteNewsItem(id);
    setNews(getNews());
  }

  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "NA";

  return (
    <div className="mx-auto max-w-3xl space-y-10">

      {/* Header */}
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-violet-400 uppercase">
          Konto
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-100" style={{ letterSpacing: "-0.02em" }}>
          Profil & inställningar
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Hantera dina uppgifter och systeminställningar.
        </p>
      </div>

      {/* Profilkort */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.30] bg-white/[0.16]">
        {/* Avatar header */}
        <div className="flex items-center gap-5 border-b border-white/[0.22] px-6 py-5">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white",
              admin
                ? "bg-gradient-to-br from-amber-500 to-orange-600"
                : "bg-gradient-to-br from-violet-600 to-indigo-600"
            )}
          >
            {initials || <User className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-gray-100">{name || "Inget namn angivet"}</span>
              {admin && (
                <span className="flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                  <Shield className="h-2.5 w-2.5" /> Admin
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{email || "E-post ej angiven"}</p>
          </div>
        </div>

        {/* Fält */}
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          {/* Namn */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
              Visningsnamn
            </label>
            <p className="rounded-xl border border-white/[0.22] bg-white/[0.08] px-3 py-2.5 text-sm text-gray-300">
              {name || "—"}
            </p>
          </div>

          {/* E-post */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
              E-postadress
            </label>
            <p className="rounded-xl border border-white/[0.22] bg-white/[0.08] px-3 py-2.5 text-sm text-gray-300">
              {email || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Inställningar */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.30] bg-white/[0.16]">
        <div className="border-b border-white/[0.22] px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-200">Inställningar</h2>
        </div>
        <div className="divide-y divide-white/[0.16]">
          {/* Roll */}
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-gray-200">Roll</p>
              <p className="mt-0.5 text-xs text-gray-500">Tilldelas av systemadministratören</p>
            </div>
            <span className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              admin
                ? "border border-amber-500/25 bg-amber-500/10 text-amber-300"
                : "border border-white/[0.30] bg-white/[0.13] text-gray-400"
            )}>
              {admin ? <><Shield className="h-3 w-3" /> Admin</> : <><User className="h-3 w-3" /> Användare</>}
            </span>
          </div>
        </div>
      </div>

      {/* Logga ut */}
      <div className="flex justify-end">
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Logga ut
          </button>
        </form>
      </div>

      {/* Admin: Nyhetshantering */}
      {admin && (
        <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.04]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-500/15 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                <Newspaper className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-200">Nyhetshantering</h2>
                <p className="text-[11px] text-amber-400/70">Adminbehörighet aktiv</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all",
                showForm
                  ? "border border-white/[0.30] bg-white/[0.13] text-gray-400 hover:text-gray-200"
                  : "bg-violet-500 text-white hover:bg-violet-400"
              )}
            >
              <Plus className={cn("h-3.5 w-3.5 transition-transform", showForm && "rotate-45")} />
              {showForm ? "Avbryt" : "Ny nyhet"}
            </button>
          </div>

          {/* Skapaformulär */}
          {showForm && (
            <form
              onSubmit={handleCreateNews}
              className="border-b border-amber-500/15 bg-white/[0.03] p-6 space-y-5"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400">
                Skapa nyhet
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                  Titel *
                </label>
                <input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Nyhetsrubrik..."
                  className="w-full rounded-xl border border-white/[0.32] bg-white/[0.13] px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:bg-white/[0.10] focus:ring-1 focus:ring-violet-500/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                  Ingress
                </label>
                <input
                  value={formExcerpt}
                  onChange={(e) => setFormExcerpt(e.target.value)}
                  placeholder="Visas i nyhetslistan..."
                  className="w-full rounded-xl border border-white/[0.32] bg-white/[0.13] px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:bg-white/[0.10] focus:ring-1 focus:ring-violet-500/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                  Innehåll *
                </label>
                <textarea
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={6}
                  placeholder="Nyhetstext. En tom rad skapar ett nytt stycke."
                  className="w-full resize-none rounded-xl border border-white/[0.32] bg-white/[0.13] px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:bg-white/[0.10] focus:ring-1 focus:ring-violet-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                    Kategori
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as NewsCategory)}
                    className="w-full rounded-xl border border-white/[0.32] bg-[#13142a] px-3 py-2.5 text-sm text-gray-200 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-400">
                    <input
                      type="checkbox"
                      checked={formPinned}
                      onChange={(e) => setFormPinned(e.target.checked)}
                      className="h-4 w-4 rounded accent-violet-500"
                    />
                    <span>Fäst nyhet</span>
                    <Pin className="h-3 w-3 text-gray-600" />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-violet-400"
                >
                  Publicera nyhet
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-white/[0.30] px-4 py-2.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/[0.13] hover:text-gray-200"
                >
                  Avbryt
                </button>
              </div>
            </form>
          )}

          {/* Lista publicerade nyheter */}
          <div className="p-6 space-y-2">
            {news.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-600">
                Inga nyheter publicerade ännu.
              </p>
            ) : (
              news.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.22] bg-white/[0.16] px-4 py-3 transition-colors hover:bg-white/[0.08]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-gray-200">
                        {item.title}
                      </span>
                      {item.pinned && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-400">
                          <Pin className="h-2.5 w-2.5" /> Fäst
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <span className={cn("h-1.5 w-1.5 rounded-full", categoryDot[item.category] ?? "bg-gray-500")} />
                        <span className={categoryText[item.category] ?? "text-gray-400"}>
                          {item.category}
                        </span>
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600">
                      {item.date} · {item.author}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="shrink-0 rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Ta bort nyhet"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
