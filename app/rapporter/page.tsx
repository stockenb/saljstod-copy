"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Report = {
  id: string;
  title: string;
  customer: string;
  status: string | null;
  next_step_due: string | null;
  tags: string[] | null;
  created_at: string;
};

export default function ReportsListPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [reports, setReports] = useState<Report[]>([]);

  async function load() {
    setLoading(true);
    let query = supabase.from("visit_reports").select("id,title,customer,status,next_step_due,tags,created_at").order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    if (q) query = query.ilike("title", `%${q}%`);
    const { data } = await query;
    setReports(data ?? []);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [q, status]);

  function toCSV(rows: any[]) {
    const header = ["id","title","customer","status","next_step_due","tags","created_at"];
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [header.join(",")].concat(rows.map(r => header.map(h => escape(h === "tags" ? (r[h]?.join("|") ?? "") : r[h])).join(",")));
    return lines.join("\n");
  }

  function downloadCSV() {
    const csv = toCSV(reports);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rapporter.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Rapporter</span>
          <h1>Besöksrapporter</h1>
          <p className="text-sm text-neutral-500">
            Följ upp kunddialoger, statusar och nästa steg. Filtrera för att snabbt hitta rätt rapport.
          </p>
        </div>
        <Link
          href="/rapporter/ny"
          className="inline-flex items-center justify-center gap-2 rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-card transition duration-calm ease-calm hover:bg-accent-600"
        >
          Skapa ny rapport
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sök</label>
          <Input placeholder="Sök i titel..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Status</label>
          <select
            className="h-11 w-full rounded-2xl border border-surface-border bg-white/90 px-4 text-sm text-neutral-700 transition duration-calm ease-calm focus:border-primary focus:outline-none dark:border-surface-dark-border dark:bg-neutral-900/80 dark:text-neutral-100"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Alla</option>
            <option>Öppet</option>
            <option>Vann</option>
            <option>Förlorat</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={downloadCSV} variant="secondary" className="w-full">
            Exportera CSV
          </Button>
        </div>
      </div>

      <div className="table-shell">
        {loading ? (
          <div className="px-6 py-8 text-sm text-neutral-500">Laddar...</div>
        ) : reports.length === 0 ? (
          <div className="px-6 py-8 text-sm text-neutral-500">Inga rapporter.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Kund</th>
                <th>Status</th>
                <th>Datum</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium text-neutral-900 dark:text-white">
                    <Link href={`/rapporter/${r.id}`} className="hover:text-primary hover:underline">
                      {r.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(r.tags ?? []).map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Link
                        href={`/rapporter/${r.id}`}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-neutral-300 px-3 py-1 font-medium text-neutral-700 transition duration-calm ease-calm hover:border-primary hover:text-primary"
                      >
                        Redigera
                      </Link>
                      <Link
                        href={`/rapporter/${r.id}/visa`}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-neutral-300 px-3 py-1 font-medium text-neutral-700 transition duration-calm ease-calm hover:border-primary hover:text-primary"
                      >
                        Visa
                      </Link>
                      <a
                        href={`/api/reports/${r.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-neutral-300 px-3 py-1 font-medium text-neutral-700 transition duration-calm ease-calm hover:border-primary hover:text-primary"
                      >
                        Ladda ned
                      </a>
                    </div>
                  </td>
                  <td>{r.customer}</td>
                  <td>
                    {r.status ? (
                      <Badge variant={r.status === "Vann" ? "success" : r.status === "Förlorat" ? "danger" : "neutral"}>
                        {r.status}
                      </Badge>
                    ) : (
                      <span className="text-xs text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="text-xs text-neutral-500">{new Date(r.created_at).toLocaleDateString("sv-SE")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
