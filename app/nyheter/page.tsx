"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Pin, Newspaper, Plus, Pencil, Trash2, X } from "lucide-react";
import { getNews, addNewsItem, updateNewsItem, deleteNewsItem, NewsItem, NewsCategory } from "@/lib/news-store";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

const CATEGORIES: NewsCategory[] = ["Produkter", "System", "Kampanj", "Övrigt"];

const categoryConfig: Record<string, { label: string; dot: string; pill: string; pillActive: string }> = {
  Produkter: {
    label: "Produkter",
    dot: "bg-blue-400",
    pill: "border-blue-500/20 bg-blue-500/10 text-blue-300",
    pillActive: "border-blue-400/50 bg-blue-500/20 text-blue-200",
  },
  System: {
    label: "System",
    dot: "bg-purple-400",
    pill: "border-purple-500/20 bg-purple-500/10 text-purple-300",
    pillActive: "border-purple-400/50 bg-purple-500/20 text-purple-200",
  },
  Kampanj: {
    label: "Kampanj",
    dot: "bg-orange-400",
    pill: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    pillActive: "border-orange-400/50 bg-orange-500/20 text-orange-200",
  },
  Övrigt: {
    label: "Övrigt",
    dot: "bg-gray-500",
    pill: "border-white/10 bg-white/[0.09] text-gray-400",
    pillActive: "border-white/20 bg-white/10 text-gray-300",
  },
};

type FormData = {
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: NewsCategory;
  date: string;
  pinned: boolean;
};

const emptyForm: FormData = {
  title: "",
  excerpt: "",
  content: "",
  author: "",
  category: "Övrigt",
  date: new Date().toISOString().split("T")[0],
  pinned: false,
};

function CategoryBadge({ category }: { category: string }) {
  const cfg = categoryConfig[category] ?? categoryConfig["Övrigt"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", cfg.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {category}
    </span>
  );
}

function PinnedCard({ item, isAdmin, onEdit, onDelete }: {
  item: NewsItem; isAdmin: boolean;
  onEdit: (item: NewsItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/15 via-indigo-500/8 to-transparent p-6 transition-all duration-300 hover:border-violet-400/35 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/10 sm:flex-row sm:items-start">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)" }}
      />
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
        <Pin className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-violet-500/30 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-violet-300 uppercase">Fäst</span>
          <CategoryBadge category={item.category} />
        </div>
        <Link href={`/nyheter/${item.slug}`} className="no-underline">
          <h2 className="text-base font-semibold leading-snug text-gray-100 hover:text-white transition-colors">{item.title}</h2>
        </Link>
        <p className="text-sm leading-relaxed text-gray-300">{item.excerpt}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gray-400">
          <span>{item.author}</span>
          <span className="opacity-30">·</span>
          <span>{new Date(item.date).toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:self-center">
        {isAdmin && (
          <>
            <button onClick={() => onEdit(item)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.08] text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/[0.16] hover:text-gray-200">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(item.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.08] text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <Link href={`/nyheter/${item.slug}`} className="no-underline">
          <ArrowUpRight className="h-4 w-4 text-violet-400 opacity-60 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </div>
  );
}

function NewsCard({ item, isAdmin, onEdit, onDelete }: {
  item: NewsItem; isAdmin: boolean;
  onEdit: (item: NewsItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.16] bg-white/[0.09] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.25] hover:bg-white/[0.13] hover:shadow-xl hover:shadow-black/30">
      <div className="flex items-start justify-between gap-2">
        <CategoryBadge category={item.category} />
        <span className="shrink-0 text-[11px] text-gray-400">
          {new Date(item.date).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
        </span>
      </div>
      <div className="flex-1">
        <Link href={`/nyheter/${item.slug}`} className="no-underline">
          <h3 className="text-sm font-semibold leading-snug text-gray-200 hover:text-white transition-colors">{item.title}</h3>
        </Link>
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-300">{item.excerpt}</p>
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.16] pt-3">
        <span className="text-[11px] text-gray-400">{item.author}</span>
        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <>
              <button onClick={() => onEdit(item)} className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-white/[0.16] hover:text-gray-300">
                <Pencil className="h-3 w-3" />
              </button>
              <button onClick={() => onDelete(item.id)} className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 hover:text-red-400">
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
          <Link href={`/nyheter/${item.slug}`} className="no-underline">
            <ArrowUpRight className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gray-300" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function NewsModal({ editItem, onClose, onSave, userName }: {
  editItem: NewsItem | null;
  onClose: () => void;
  onSave: () => void;
  userName: string;
}) {
  const isEdit = !!editItem;
  const [form, setForm] = useState<FormData>(
    editItem
      ? { title: editItem.title, excerpt: editItem.excerpt, content: editItem.content, author: editItem.author, category: editItem.category, date: editItem.date, pinned: !!editItem.pinned }
      : { ...emptyForm, author: userName }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (isEdit && editItem) {
      updateNewsItem(editItem.id, form);
    } else {
      addNewsItem(form);
    }
    onSave();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl border border-white/[0.12] bg-[#13142a] shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-100">{isEdit ? "Redigera nyhet" : "Skapa nyhet"}</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-white/[0.08] hover:text-gray-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Rubrik *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full rounded-xl border border-white/[0.12] bg-white/[0.06] px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors"
              placeholder="Nyhetsrubrik"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Ingress</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              rows={2}
              className="w-full resize-none rounded-xl border border-white/[0.12] bg-white/[0.06] px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors"
              placeholder="Kort sammanfattning..."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Innehåll</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={5}
              className="w-full resize-none rounded-xl border border-white/[0.12] bg-white/[0.06] px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors"
              placeholder="Nyhetstext..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Kategori</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as NewsCategory })}
                className="w-full rounded-xl border border-white/[0.12] bg-white/[0.06] px-3.5 py-2.5 text-sm text-gray-100 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors"
              >
                {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#13142a]">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Datum</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-white/[0.12] bg-white/[0.06] px-3.5 py-2.5 text-sm text-gray-100 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Författare</label>
            <input
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              className="w-full rounded-xl border border-white/[0.12] bg-white/[0.06] px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-colors"
              placeholder="Ditt namn"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2.5">
            <div
              onClick={() => setForm({ ...form, pinned: !form.pinned })}
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                form.pinned ? "border-violet-500 bg-violet-500" : "border-white/20 bg-white/[0.06]"
              )}
            >
              {form.pinned && <Pin className="h-2.5 w-2.5 text-white" />}
            </div>
            <span className="text-sm text-gray-300">Fäst nyhet</span>
          </label>
          <div className="flex justify-end gap-2 border-t border-white/[0.08] pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">
              Avbryt
            </button>
            <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors">
              {isEdit ? "Spara" : "Publicera"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewsPage() {
  const { isAdmin, name: userName } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [active, setActive] = useState<string>("Alla");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<NewsItem | null>(null);

  function reload() { setNews(getNews()); }

  useEffect(() => { reload(); }, []);

  function handleEdit(item: NewsItem) { setEditItem(item); setModalOpen(true); }
  function handleCreate() { setEditItem(null); setModalOpen(true); }
  function handleDelete(id: string) {
    if (!confirm("Radera denna nyhet?")) return;
    deleteNewsItem(id);
    reload();
  }
  function handleCloseModal() { setModalOpen(false); setEditItem(null); }

  const filtered = active === "Alla" ? news : news.filter((n) => n.category === active);
  const pinned = filtered.filter((n) => n.pinned);
  const rest = filtered.filter((n) => !n.pinned);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-violet-400 uppercase">Aktuellt</p>
          <h1 className="text-3xl font-black tracking-tight text-gray-100" style={{ letterSpacing: "-0.02em" }}>Nyheter</h1>
          <p className="mt-2 text-sm text-gray-400">Senaste uppdateringar och information från säljteamet.</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleCreate}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Skapa nyhet
          </button>
        )}
      </div>

      {/* ── Kategorifilter ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActive("Alla")}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
            active === "Alla"
              ? "border-violet-500/40 bg-violet-500/20 text-violet-200"
              : "border-white/[0.16] bg-white/[0.09] text-gray-400 hover:border-white/[0.25] hover:text-gray-300"
          )}
        >
          Alla
        </button>
        {CATEGORIES.map((cat) => {
          const cfg = categoryConfig[cat];
          return (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
                active === cat ? cfg.pillActive : cfg.pill + " hover:opacity-80"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── Fästa nyheter ──────────────────────────────────── */}
      {pinned.length > 0 && (
        <div className="space-y-3">
          {pinned.map((item) => (
            <PinnedCard key={item.id} item={item} isAdmin={isAdmin} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* ── Nyhetsgrid ─────────────────────────────────────── */}
      {rest.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((item) => (
            <NewsCard key={item.id} item={item} isAdmin={isAdmin} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* ── Tomt tillstånd ─────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.09] text-gray-500">
            <Newspaper className="h-5 w-5" />
          </div>
          <p className="text-sm text-gray-500">Inga nyheter i denna kategori.</p>
          {isAdmin && (
            <button onClick={handleCreate} className="mt-1 flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors">
              <Plus className="h-3.5 w-3.5" />
              Skapa den första
            </button>
          )}
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────── */}
      {modalOpen && (
        <NewsModal
          editItem={editItem}
          onClose={handleCloseModal}
          onSave={reload}
          userName={userName}
        />
      )}
    </div>
  );
}
