import Link from "next/link";
import { ArrowUpRight, BarChart3, CheckCircle2, Info, AlertTriangle, ImageOff, FileX, AlignLeft } from "lucide-react";
import { getDashboardData } from "@/lib/dashboard-metrics";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const stats = [
    { label: "Artiklar totalt", value: data.stats.totalProducts, color: "text-violet-300", bar: "bg-violet-400" },
    { label: "Moderartiklar", value: data.stats.parentProducts, color: "text-indigo-300", bar: "bg-indigo-400" },
    { label: "Varianter", value: data.stats.variants, color: "text-sky-300", bar: "bg-sky-400" },
    { label: "Kategorier", value: data.stats.categories, color: "text-emerald-300", bar: "bg-emerald-400" },
    { label: "Spec-nycklar", value: data.stats.uniqueSpecKeys, color: "text-teal-300", bar: "bg-teal-400" },
  ];

  const qualityCards = [
    {
      id: "missing-images",
      title: "Utan bild",
      description: "saknar produktbild",
      value: data.dataQualityCounts.missingImage,
      icon: ImageOff,
    },
    {
      id: "missing-specs",
      title: "Utan teknisk data",
      description: "saknar specifikationer",
      value: data.dataQualityCounts.missingSpecs,
      icon: FileX,
    },
    {
      id: "missing-description",
      title: "Utan beskrivning",
      description: "saknar artikelbeskrivning",
      value: data.dataQualityCounts.missingDescription,
      icon: AlignLeft,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-12">

      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-violet-400 uppercase">
          Översikt
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-100" style={{ letterSpacing: "-0.02em" }}>
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Produktdata, kategorier och kvalitetsavvikelser från XML-feeden.
        </p>
      </div>

      {/* ── Statistik ──────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Produktstatistik</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-2xl border border-white/[0.30] bg-white/[0.16] p-5"
            >
              {/* Progress bar top */}
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl bg-white/[0.08]">
                <div
                  className={`h-full rounded-t-2xl ${stat.bar} opacity-70`}
                  style={{ width: `${60 + i * 8}%` }}
                />
              </div>

              <div className={`text-3xl font-black tracking-tight ${stat.color}`} style={{ letterSpacing: "-0.02em" }}>
                {stat.value.toLocaleString("sv-SE")}
              </div>
              <p className="mt-1.5 text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Datakvalitet ───────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Datakvalitet</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {qualityCards.map((card) => {
            const Icon = card.icon;
            const pct = Math.min(100, Math.max(4, card.value));
            return (
              <div
                key={card.id}
                className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-500/70">
                    Varning
                  </span>
                </div>
                <div className="mt-4 text-3xl font-black tracking-tight text-amber-200" style={{ letterSpacing: "-0.02em" }}>
                  {card.value.toLocaleString("sv-SE")}
                </div>
                <p className="mt-1 text-xs text-amber-300/70">{card.description}</p>
                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-amber-500/15">
                  <div className="h-full rounded-full bg-amber-400/60" style={{ width: `${pct}%` }} />
                </div>
                <Link
                  href={`#${card.id}`}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-400 no-underline transition-colors hover:text-amber-300"
                >
                  Visa lista <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}

          {/* Familjeavvikelser */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.07] p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                <Info className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-indigo-400/70">
                Avvikelse
              </span>
            </div>
            <div className="mt-4 text-3xl font-black tracking-tight text-indigo-200" style={{ letterSpacing: "-0.02em" }}>
              {data.inconsistentFamilyCount.toLocaleString("sv-SE")}
            </div>
            <p className="mt-1 text-xs text-indigo-300/70">familjer med inkonsekventa specifikationer</p>
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-indigo-500/15">
              <div
                className="h-full rounded-full bg-indigo-400/60"
                style={{ width: `${Math.min(100, data.inconsistentFamilyCount * 8)}%` }}
              />
            </div>
            <Link
              href="#familjeavvikelser"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-400 no-underline transition-colors hover:text-indigo-300"
            >
              Visa familjer <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Detaljtabeller ─────────────────────────────────── */}
      <section className="space-y-6">
        <DetailTable
          id="missing-images"
          title="Produkter utan bild"
          description="Artiklar som saknar bildlänk i feeden."
          columns={["SKU", "Namn", "Kategori(er)", "Länk"]}
          rows={data.missingImageProducts.map((product) => [
            product.articleNumber,
            product.title,
            (data.categoryLookup.get(product.articleNumber) || ["–"]).join(", "),
            <Link
              key={product.articleNumber}
              href={product.link || "#"}
              className="inline-flex items-center gap-1 text-xs text-sky-400 no-underline hover:text-sky-300"
              prefetch={false}
            >
              Visa <ArrowUpRight className="h-3 w-3" />
            </Link>,
          ])}
        />

        <DetailTable
          id="missing-specs"
          title="Produkter utan teknisk data"
          description="Artiklar som saknar specifikationer."
          columns={["SKU", "Namn", "Kategori"]}
          rows={data.missingSpecsProducts.map((product) => [
            product.articleNumber,
            product.title,
            (data.categoryLookup.get(product.articleNumber) || ["–"]).join(", "),
          ])}
        />

        <DetailTable
          id="missing-description"
          title="Produkter utan beskrivning"
          description="Artiklar där FullDescription saknas eller är tom."
          columns={["SKU", "Namn", "Kategori"]}
          rows={data.missingDescriptionProducts.map((product) => [
            product.articleNumber,
            product.title,
            (data.categoryLookup.get(product.articleNumber) || ["–"]).join(", "),
          ])}
        />

        <DetailTable
          id="familjeavvikelser"
          title="Familjeavvikelser"
          description="Familjer där någon artikel saknar specifikation som de andra har."
          columns={["Familj/Moderartikel", "SKU som avviker", "Saknad spec-nyckel"]}
          rows={data.familySpecIssues.map((issue) => [
            `${issue.familySku} – ${issue.familyTitle}`,
            issue.variantSku,
            issue.missingKeys.join(", "),
          ])}
        />
      </section>

    </div>
  );
}

function DetailTable({
  id,
  title,
  description,
  columns,
  rows,
}: {
  id: string;
  title: string;
  description: string;
  columns: string[];
  rows: (string | number | JSX.Element)[][];
}) {
  return (
    <section id={id} className="overflow-hidden rounded-2xl border border-white/[0.30] bg-white/[0.16]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.22] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{description}</p>
        </div>
        <span className="rounded-full border border-white/[0.30] bg-white/[0.16] px-3 py-1 text-xs font-semibold text-gray-400">
          {rows.length} st
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/[0.32]">
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, i) => (
                <tr
                  key={`${id}-${i}`}
                  className={`transition-colors hover:bg-white/[0.08] ${i !== rows.length - 1 ? "border-b border-white/[0.06]" : ""}`}
                >
                  {row.map((cell, ci) => (
                    <td key={`${id}-${i}-${ci}`} className="px-5 py-3 text-xs align-top text-gray-300">
                      {typeof cell === "string" || typeof cell === "number" ? (
                        <span className={ci === 0 ? "font-mono font-semibold text-gray-200" : ""}>
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-xs text-gray-500">
                  Ingen data att visa
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
