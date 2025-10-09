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
  status: string;
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
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Besöksrapporter</h1>
        <Link className="underline" href="/rapporter/ny">Skapa ny</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm">Sök</label>
          <Input placeholder="Sök i titel..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">Status</label>
          <select className="h-11 w-full rounded-2xl border border-neutral-300 px-3" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Alla</option>
            <option>Öppet</option>
            <option>Vann</option>
            <option>Förlorat</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button onClick={downloadCSV} variant="outline">Exportera CSV</Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <p>Laddar...</p> : reports.length === 0 ? <p>Inga rapporter.</p> : reports.map(r => (
          <div key={r.id} className="card p-4 flex items-center justify-between">
            <div>
              <Link href={"/rapporter/" + r.id} className="font-medium hover:underline">{r.title}</Link>
              <p className="text-sm text-neutral-500">{r.customer} • {new Date(r.created_at).toLocaleDateString("sv-SE")}</p>
              <div className="mt-1 flex gap-2">{(r.tags ?? []).map(t => <Badge key={t}>{t}</Badge>)}</div>
            </div>
            <div className="text-sm text-neutral-600">{r.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
