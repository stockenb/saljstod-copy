"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Status = "none" | "red" | "yellow" | "green";

type Prospect = {
  id: string;
  company_name: string;
  city: string;
  contact_person: string;
  comment: string;
  status: Status;
};

const STATUS_COLORS: Record<Status, { row: string; btn: string; label: string }> = {
  none:   { row: "",                            btn: "bg-white/[0.10] border-white/30 text-gray-500",              label: "—" },
  red:    { row: "bg-red-500/25",               btn: "bg-red-500/30 border-red-500/50 text-red-200",               label: "Röd" },
  yellow: { row: "bg-amber-500/20",             btn: "bg-amber-500/30 border-amber-500/50 text-amber-200",         label: "Gul" },
  green:  { row: "bg-emerald-500/20",           btn: "bg-emerald-500/30 border-emerald-500/50 text-emerald-200",   label: "Grön" },
};

const STATUS_DOT: Record<Status, string> = {
  none:   "bg-white/20",
  red:    "bg-red-400",
  yellow: "bg-amber-400",
  green:  "bg-emerald-400",
};

function InlineCell({
  value,
  onChange,
  placeholder,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  function commit() {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }

  if (editing) {
    const props = {
      ref,
      value: draft,
      autoFocus: true,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multiline) commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      },
      className: "w-full bg-white/[0.07] rounded-lg border border-violet-500/50 px-2 py-1 text-sm text-gray-100 outline-none ring-1 ring-violet-500/30 resize-none",
    };
    return multiline
      ? <textarea {...props} rows={2} />
      : <input {...props} />;
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        "block w-full cursor-text rounded-lg px-2 py-1 text-sm transition-colors hover:bg-white/[0.07]",
        value ? "text-gray-200" : "text-gray-600"
      )}
    >
      {value || placeholder}
    </span>
  );
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!user) return;
    fetchProspects();
  }, [user]);

  async function fetchProspects() {
    const supabase = createClient();
    setLoading(true);
    const { data } = await supabase
      .from("prospects")
      .select("id, company_name, city, contact_person, comment, status")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true });
    setProspects((data as Prospect[]) || []);
    setLoading(false);
  }

  async function addRow() {
    const supabase = createClient();
    const { data } = await supabase
      .from("prospects")
      .insert({ user_id: user!.id, company_name: "", city: "", contact_person: "", comment: "", status: "none" })
      .select("id, company_name, city, contact_person, comment, status")
      .single();
    if (data) setProspects((prev) => [...prev, data as Prospect]);
  }

  async function updateField(id: string, field: keyof Omit<Prospect, "id">, value: string) {
    setProspects((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
    const supabase = createClient();
    await supabase.from("prospects").update({ [field]: value }).eq("id", id);
  }

  async function deleteRow(id: string) {
    setProspects((prev) => prev.filter((p) => p.id !== id));
    const supabase = createClient();
    await supabase.from("prospects").delete().eq("id", id);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-violet-400 uppercase">
            Försäljning
          </p>
          <h1 className="text-3xl font-black tracking-tight text-gray-100" style={{ letterSpacing: "-0.02em" }}>
            Potentiella nykunder
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Klicka på ett fält för att redigera. Sätt status med färgknapparna.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/prospects/admin"
            className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
          >
            <Users className="h-3.5 w-3.5" />
            Adminvy
          </Link>
        )}
      </div>

      {/* Tabell */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.16]">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-600">Laddar…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/[0.10] bg-white/[0.04]">
                  {["Kund", "Ort", "Kontaktperson", "Kommentar", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {prospects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-gray-600">
                      Inga prospects än. Lägg till en rad nedan.
                    </td>
                  </tr>
                )}
                {prospects.map((p) => (
                  <tr key={p.id} className={cn("transition-colors", STATUS_COLORS[p.status].row)}>
                    <td className="px-3 py-2 min-w-[140px]">
                      <InlineCell value={p.company_name} placeholder="Företagsnamn…" onChange={(v) => updateField(p.id, "company_name", v)} />
                    </td>
                    <td className="px-3 py-2 min-w-[110px]">
                      <InlineCell value={p.city} placeholder="Ort…" onChange={(v) => updateField(p.id, "city", v)} />
                    </td>
                    <td className="px-3 py-2 min-w-[140px]">
                      <InlineCell value={p.contact_person} placeholder="Kontakt…" onChange={(v) => updateField(p.id, "contact_person", v)} />
                    </td>
                    <td className="px-3 py-2 min-w-[200px]">
                      <InlineCell value={p.comment} placeholder="Kommentar…" multiline onChange={(v) => updateField(p.id, "comment", v)} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {(["none", "red", "yellow", "green"] as Status[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => updateField(p.id, "status", s)}
                            title={STATUS_COLORS[s].label}
                            className={cn(
                              "h-5 w-5 rounded-full border transition-all",
                              p.status === s
                                ? cn(STATUS_DOT[s], "border-white/40 scale-110 shadow-lg")
                                : cn("border-white/[0.12] hover:scale-110", s === "none" ? "bg-white/10" : STATUS_DOT[s], "opacity-40 hover:opacity-80")
                            )}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => deleteRow(p.id)}
                        className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Lägg till rad */}
        <div className="border-t border-white/[0.08] px-4 py-3">
          <button
            onClick={addRow}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-white/[0.07] hover:text-gray-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Lägg till rad
          </button>
        </div>
      </div>
    </div>
  );
}
