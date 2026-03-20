"use client";

import { ChangeEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, X, Search, Truck } from "lucide-react";
import { matchAndCompute, validateColumns, type DataRow } from "@/lib/fraktkollen";
import { cn } from "@/lib/utils";

const SENDIFY_REQUIRED_COLUMNS = ["SENDER_REFERENCE", "PRICE"];
const MONITOR_REQUIRED_COLUMNS = ["Ordernummer", "Kundnamn", "Benämning", "Belopp"];

const CURRENCY_FORMATTER = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 2,
});

function sanitizeRows(rows: DataRow[]) {
  return rows
    .map((row) => {
      const sanitized: DataRow = {};
      Object.entries(row).forEach(([key, value]) => {
        sanitized[key.trim().replace(/^\uFEFF/, "")] = value;
      });
      return sanitized;
    })
    .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
}

async function parseSpreadsheet(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", raw: false, cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("Filen saknar blad eller innehåll.");
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<DataRow>(sheet, { defval: "" });
  return sanitizeRows(rows);
}

export default function FraktkollenPage() {
  const [sendifyRows, setSendifyRows] = useState<DataRow[] | null>(null);
  const [monitorRows, setMonitorRows] = useState<DataRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendifyFileName, setSendifyFileName] = useState("");
  const [monitorFileName, setMonitorFileName] = useState("");
  const [query, setQuery] = useState("");

  const computed = useMemo(() => {
    if (!sendifyRows || !monitorRows) return null;
    return matchAndCompute(sendifyRows, monitorRows);
  }, [sendifyRows, monitorRows]);

  const filteredRows = useMemo(() => {
    if (!computed) return [];
    const q = query.trim().toLowerCase();
    if (!q) return computed.rows;
    return computed.rows.filter(
      (row) =>
        row.ordernummer.toLowerCase().includes(q) ||
        row.kundnamn.toLowerCase().includes(q) ||
        row.benamning.toLowerCase().includes(q),
    );
  }, [computed, query]);

  const readSendifyFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      const rows = await parseSpreadsheet(file);
      const validation = validateColumns(rows, SENDIFY_REQUIRED_COLUMNS);
      if (!validation.ok) throw new Error(`Sendify-filen saknar kolumner: ${validation.missingColumns.join(", ")}`);
      setSendifyRows(rows);
      setSendifyFileName(file.name);
    } catch (e) {
      setSendifyRows(null);
      setSendifyFileName("");
      setError(e instanceof Error ? e.message : "Kunde inte läsa Sendify-filen.");
    }
  };

  const readMonitorFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      const rows = await parseSpreadsheet(file);
      const validation = validateColumns(rows, MONITOR_REQUIRED_COLUMNS);
      if (!validation.ok) throw new Error(`Monitor-filen saknar kolumner: ${validation.missingColumns.join(", ")}`);
      setMonitorRows(rows);
      setMonitorFileName(file.name);
    } catch (e) {
      setMonitorRows(null);
      setMonitorFileName("");
      setError(e instanceof Error ? e.message : "Kunde inte läsa Monitor-filen.");
    }
  };

  const clearAll = () => {
    setSendifyRows(null);
    setMonitorRows(null);
    setSendifyFileName("");
    setMonitorFileName("");
    setQuery("");
    setError(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-violet-400 uppercase">
          Statistik & övrigt
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-100" style={{ letterSpacing: "-0.02em" }}>
          Fraktkollen
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Matcha fraktkostnad mot orderintäkt och se täckningsbidrag per order.
        </p>
      </div>

      {/* Uppladdning */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.30] bg-white/[0.12]">
        <div className="border-b border-white/[0.22] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
              <Upload className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold text-gray-200">Ladda upp filer</h2>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2">
          {/* Sendify */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
              Sendify-fil
            </label>
            <label className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
              sendifyRows
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                : "border-white/[0.14] bg-white/[0.08] text-gray-500 hover:border-violet-500/40 hover:bg-white/[0.13] hover:text-gray-300"
            )}>
              <Upload className="h-5 w-5" />
              <span className="text-xs font-medium">
                {sendifyFileName || "Välj CSV / Excel-fil"}
              </span>
              <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={readSendifyFile} />
            </label>
          </div>

          {/* Monitor */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
              Monitor-fil
            </label>
            <label className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
              monitorRows
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                : "border-white/[0.14] bg-white/[0.08] text-gray-500 hover:border-violet-500/40 hover:bg-white/[0.13] hover:text-gray-300"
            )}>
              <Upload className="h-5 w-5" />
              <span className="text-xs font-medium">
                {monitorFileName || "Välj CSV / Excel-fil"}
              </span>
              <input type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={readMonitorFile} />
            </label>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-xs leading-relaxed text-red-300">{error}</p>
          </div>
        )}

        {(sendifyRows || monitorRows) && (
          <div className="border-t border-white/[0.32] px-6 py-3">
            <button
              onClick={clearAll}
              className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-300"
            >
              Rensa och ladda om filer
            </button>
          </div>
        )}
      </div>

      {/* Resultat */}
      {computed && (
        <div className="space-y-6">
          {/* Sök */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sök på ordernummer, kundnamn eller benämning…"
              className="w-full max-w-md rounded-xl border border-white/[0.32] bg-white/[0.13] py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            />
          </div>

          {/* Tabell */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.30]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.22] bg-white/[0.08]">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Ordernummer</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Kundnamn</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Benämning</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Sendify</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Monitor</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">Täckningsbidrag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.12]">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-600">
                        Inga matchande rader hittades.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={`${row.ordernummer}-${row.kundnamn}`} className="transition-colors hover:bg-white/[0.08]">
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-300">{row.ordernummer}</td>
                        <td className="px-4 py-3 text-sm text-gray-200">{row.kundnamn}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{row.benamning}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">{CURRENCY_FORMATTER.format(row.price)}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">{CURRENCY_FORMATTER.format(row.belopp)}</td>
                        <td className={cn(
                          "px-4 py-3 text-right text-sm font-semibold",
                          row.tackningsbidrag >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                          {CURRENCY_FORMATTER.format(row.tackningsbidrag)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ej matchade */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.30] bg-white/[0.12] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                Ej matchade Sendify-refs
              </p>
              <p className="mt-2 text-sm text-gray-400">
                {computed.unmatchedSendifyReferences.length > 0
                  ? computed.unmatchedSendifyReferences.join(", ")
                  : <span className="text-gray-600">Inga</span>}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.30] bg-white/[0.12] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                Ej matchade Monitor-ordrar
              </p>
              <p className="mt-2 text-sm text-gray-400">
                {computed.unmatchedMonitorOrders.length > 0
                  ? computed.unmatchedMonitorOrders.join(", ")
                  : <span className="text-gray-600">Inga</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {!computed && !error && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.22] bg-white/[0.03] py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.13] text-gray-500">
            <Truck className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-500">Ladda upp båda filer för att visa resultat.</p>
        </div>
      )}
    </div>
  );
}
