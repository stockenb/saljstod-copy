import Link from "next/link";
import { ArrowUpRight, BarChart3, CheckCircle2, ImageOff, Info } from "lucide-react";

import { getDashboardData } from "@/lib/dashboard-metrics";

const funCardIcons = [BarChart3, CheckCircle2, Info];

export default async function DashboardPage() {
  const data = await getDashboardData();

  const funFacts = [
    { label: "Artiklar totalt", value: data.stats.totalProducts },
    { label: "Moderartiklar", value: data.stats.parentProducts },
    { label: "Varianter", value: data.stats.variants },
    { label: "Kategorier", value: data.stats.categories },
    { label: "Unika specifikationsnycklar", value: data.stats.uniqueSpecKeys },
  ];

  const dataQualityCards = [
    {
      id: "missing-images",
      title: "Produkter utan bild",
      value: data.dataQualityCounts.missingImage,
      description: "saknar produktbild",
    },
    {
      id: "missing-specs",
      title: "Produkter utan teknisk data",
      value: data.dataQualityCounts.missingSpecs,
      description: "saknar specifikationer",
    },
    {
      id: "missing-description",
      title: "Produkter utan beskrivning",
      value: data.dataQualityCounts.missingDescription,
      description: "saknar FullDescription",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 pb-16 pt-10 sm:px-10">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Dashboard</p>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          Dashboard – produktdata &amp; datakvalitet
        </h1>
        <p className="max-w-3xl text-slate-600">
          Översikt över XML-feedens produkter, kategorier och möjliga kvalitetsavvikelser.
        </p>
      </div>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funFacts.map((fact, index) => {
            const Icon = funCardIcons[index % funCardIcons.length];
            return (
              <div
                key={fact.label}
                className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-xl bg-sky-50 p-2 text-sky-600">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="flex h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bg-gradient-to-r from-sky-400 to-indigo-500"
                      style={{ width: `${70 + (index % 3) * 10}%` }}
                    />
                  </div>
                </div>
                <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                  {fact.value.toLocaleString("sv-SE")}
                </div>
                <p className="mt-1 text-sm text-slate-600">{fact.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dataQualityCards.map((card) => (
          <div
            key={card.id}
            className="relative overflow-hidden rounded-2xl border border-amber-50 bg-amber-50/80 p-5 shadow-[0_14px_34px_rgba(251,191,36,0.25)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-700">Datakvalitet</p>
                <div className="mt-2 text-3xl font-semibold text-amber-900">
                  {card.value.toLocaleString("sv-SE")}
                </div>
                <p className="text-sm text-amber-800">{card.description}</p>
              </div>
              <div className="rounded-full bg-white/70 p-3 text-amber-600 shadow-inner">
                <ImageOff className="h-6 w-6" aria-hidden />
              </div>
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400"
                style={{ width: `${Math.min(100, Math.max(10, card.value))}%` }}
              />
            </div>
            <Link
              href={`#${card.id}`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-900 underline decoration-amber-400 decoration-2 underline-offset-4"
            >
              Visa lista
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ))}

        <div className="relative overflow-hidden rounded-2xl border border-indigo-50 bg-white p-5 shadow-[0_16px_40px_rgba(79,70,229,0.14)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-500">Familjeavvikelser</p>
              <div className="mt-2 text-3xl font-semibold text-slate-900">
                {data.inconsistentFamilyCount.toLocaleString("sv-SE")}
              </div>
              <p className="text-sm text-slate-600">
                Familjer med inkonsekventa specifikationer (saknade värden i vissa artiklar).
              </p>
            </div>
            <div className="rounded-full bg-indigo-50 p-3 text-indigo-500">
              <Info className="h-6 w-6" aria-hidden />
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-sky-400"
              style={{ width: `${Math.min(100, data.inconsistentFamilyCount * 8)}%` }}
            />
          </div>
          <Link
            href="#familjeavvikelser"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Visa avvikande familjer
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-rose-50 bg-white p-5 shadow-[0_16px_40px_rgba(225,29,72,0.12)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-rose-500">Dimensioner</p>
              <div className="mt-2 text-3xl font-semibold text-slate-900">
                {data.dimensionIssues.length.toLocaleString("sv-SE")}
              </div>
              <p className="text-sm text-slate-600">Artiklar med avvikande Storlek/mått.</p>
            </div>
            <div className="rounded-full bg-rose-50 p-3 text-rose-500">
              <BarChart3 className="h-6 w-6" aria-hidden />
            </div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-rose-100">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-orange-400"
              style={{ width: `${Math.min(100, data.dimensionIssues.length * 6)}%` }}
            />
          </div>
          <Link
            href="#dimensioner"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
          >
            Visa lista
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

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
              className="text-sky-600 underline"
              prefetch={false}
            >
              Visa produkt
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

        <DetailTable
          id="dimensioner"
          title="Misstänkta dimensioner"
          description="Artiklar med otolkbara eller avvikande storleksvärden."
          columns={["SKU", "Namn", "Storlek", "Kommentar"]}
          rows={data.dimensionIssues.map((issue) => [
            issue.sku,
            issue.title,
            issue.size || "—",
            issue.reason,
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
    <section id={id} className="space-y-3 rounded-2xl border border-slate-100 bg-white/70 p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {rows.length} st
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-100">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/70">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-sm text-slate-800">
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={`${id}-${index}`} className="hover:bg-slate-50/60">
                  {row.map((cell, cellIndex) => (
                    <td key={`${id}-${index}-${cellIndex}`} className="px-4 py-3 align-top">
                      {typeof cell === "string" || typeof cell === "number" ? (
                        <span className="leading-relaxed">{cell}</span>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500">
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
