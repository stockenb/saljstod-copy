import Link from "next/link";
import {
  FileText,
  Files,
  Database,
  BookOpen,
  BarChart2,
  Tag,
  MapPin,
  Factory,
  Grid2X2,
  Rabbit,
  ArrowUpRight,
  Clock,
  Truck,
} from "lucide-react";
import { LatestNews } from "@/components/latest-news";

type Tool = {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  external?: boolean;
  featured?: boolean;
  color?: string;
};

const allTools: Tool[] = [
  {
    href: "/produktblad",
    title: "Skapa produktblad",
    description:
      "Generera professionella produktblad som PDF för enskilda artiklar direkt ur artikeldatabasen.",
    icon: FileText,
    featured: true,
    color: "violet",
  },
  {
    href: "/artikelbas",
    title: "Artikelbas",
    description: "Sök och filtrera artiklar för att snabbt bygga upp artikelurval.",
    icon: Database,
    color: "indigo",
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Visualisera produktflöde, datakvalitet och statistik.",
    icon: BarChart2,
    color: "sky",
  },
  {
    href: "https://karta.nilsahlgren.se",
    title: "Villastängsel",
    description:
      "Interaktiv stängselplanerare för bostadsmiljö med beräkningar och materiallistor.",
    icon: MapPin,
    external: true,
    color: "emerald",
  },
  {
    href: "https://industristangsel.vercel.app/",
    title: "Industristängsel",
    description: "Planerare för industristängsel med XML-export för direktbeställning.",
    icon: Factory,
    external: true,
    color: "teal",
  },
  {
    href: "/produktblad/samlat",
    title: "Samlat produktblad",
    description: "Kombinera flera artiklar till ett samlat produktblad.",
    icon: Files,
    color: "purple",
  },
  {
    href: "/ean",
    title: "EAN-generator",
    description: "Generera och ladda ned EAN-13 streckkoder som PNG.",
    icon: Tag,
    color: "amber",
  },
  {
    href: "/fraktkollen",
    title: "Fraktkollen",
    description: "Matcha fraktkostnad mot orderintäkt och se täckningsbidrag per order.",
    icon: Truck,
    color: "teal",
  },
  {
    href: "",
    title: "Panelstängsel",
    description: "Stängselplanerare anpassad för panelstängsel.",
    icon: Grid2X2,
    badge: "Kommer snart",
  },
  {
    href: "",
    title: "Viltstängsel",
    description: "Specialplanerare för vilt- och markstängsel.",
    icon: Rabbit,
    badge: "Kommer snart",
  },
  {
    href: "",
    title: "Generera katalog",
    description: "Skapa en fullständig katalog utifrån valda produktkategorier.",
    icon: BookOpen,
    badge: "Kommer snart",
  },
];

const colorMap: Record<string, { bg: string; border: string; icon: string; glow: string }> = {
  violet: {
    bg: "from-violet-500/15 to-violet-600/8",
    border: "border-violet-500/20 hover:border-violet-400/40",
    icon: "bg-violet-500/15 text-violet-300",
    glow: "hover:shadow-violet-500/10",
  },
  indigo: {
    bg: "from-indigo-500/15 to-indigo-600/8",
    border: "border-indigo-500/20 hover:border-indigo-400/40",
    icon: "bg-indigo-500/15 text-indigo-300",
    glow: "hover:shadow-indigo-500/10",
  },
  sky: {
    bg: "from-sky-500/15 to-sky-600/8",
    border: "border-sky-500/20 hover:border-sky-400/40",
    icon: "bg-sky-500/15 text-sky-300",
    glow: "hover:shadow-sky-500/10",
  },
  emerald: {
    bg: "from-emerald-500/15 to-emerald-600/8",
    border: "border-emerald-500/20 hover:border-emerald-400/40",
    icon: "bg-emerald-500/15 text-emerald-300",
    glow: "hover:shadow-emerald-500/10",
  },
  teal: {
    bg: "from-teal-500/15 to-teal-600/8",
    border: "border-teal-500/20 hover:border-teal-400/40",
    icon: "bg-teal-500/15 text-teal-300",
    glow: "hover:shadow-teal-500/10",
  },
  purple: {
    bg: "from-purple-500/15 to-purple-600/8",
    border: "border-purple-500/20 hover:border-purple-400/40",
    icon: "bg-purple-500/15 text-purple-300",
    glow: "hover:shadow-purple-500/10",
  },
  amber: {
    bg: "from-amber-500/15 to-amber-600/8",
    border: "border-amber-500/20 hover:border-amber-400/40",
    icon: "bg-amber-500/15 text-amber-300",
    glow: "hover:shadow-amber-500/10",
  },
};

const defaultColor = {
  bg: "from-white/[0.07] to-white/[0.03]",
  border: "border-white/[0.12] hover:border-white/25",
  icon: "bg-white/[0.12] text-gray-300",
  glow: "hover:shadow-white/5",
};

function ToolCard({ tool, large }: { tool: Tool; large?: boolean }) {
  const isInactive = !tool.href;
  const Icon = tool.icon;
  const c = tool.color ? colorMap[tool.color] : defaultColor;

  const inner = (
    <div
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-gradient-to-br transition-all duration-300 ${c.bg} ${c.border} ${c.glow} ${
        isInactive
          ? "cursor-not-allowed opacity-40"
          : `cursor-pointer hover:-translate-y-1 hover:shadow-xl`
      } ${large ? "p-8" : "p-5"}`}
    >
      {/* Subtle noise texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Badge */}
      {tool.badge && (
        <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full border border-white/[0.22]0 bg-white/[0.09] px-2.5 py-1 text-[10px] font-medium tracking-wide text-gray-500">
          <Clock className="h-2.5 w-2.5" />
          {tool.badge}
        </span>
      )}

      {tool.external && !isInactive && (
        <span className="absolute right-4 top-4 rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium tracking-wide text-sky-400">
          Extern
        </span>
      )}

      {/* Icon */}
      <div
        className={`mb-auto flex items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${c.icon} ${large ? "h-14 w-14" : "h-10 w-10"}`}
      >
        <Icon className={large ? "h-7 w-7" : "h-5 w-5"} strokeWidth={1.5} />
      </div>

      {/* Text */}
      <div className={large ? "mt-8" : "mt-5"}>
        <h3
          className={`font-semibold text-gray-100 ${large ? "text-xl" : "text-sm"}`}
        >
          {tool.title}
        </h3>
        <p
          className={`mt-1.5 leading-relaxed text-gray-300 ${large ? "text-sm" : "text-xs"}`}
        >
          {tool.description}
        </p>
      </div>

      {/* Arrow */}
      {!isInactive && (
        <div className="mt-4 flex items-center gap-1 text-xs font-medium text-gray-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-gray-200">
          <ArrowUpRight
            className={`transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${large ? "h-5 w-5" : "h-3.5 w-3.5"}`}
          />
        </div>
      )}
    </div>
  );

  if (isInactive) return <div aria-disabled="true">{inner}</div>;
  if (tool.external)
    return (
      <a href={tool.href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {inner}
      </a>
    );
  return (
    <Link href={tool.href} className="block h-full">
      {inner}
    </Link>
  );
}

export default function HomePage() {
  const [featured, ...rest] = allTools;
  const active = rest.filter((t) => t.href);
  const inactive = rest.filter((t) => !t.href);

  return (
    <div className="-mx-6 -mt-10 sm:-mx-8 lg:-mx-10">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 pb-16 pt-20 sm:px-12 lg:px-16"
        style={{ background: "linear-gradient(135deg, #0d0e18 0%, #111326 50%, #0e1020 100%)" }}
      >
        {/* Background orbs */}
        <div
          className="pointer-events-none absolute -left-32 top-0 h-[500px] w-[500px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl">
          {/* Main headline */}
          <div className="max-w-3xl">
            <p className="mb-3 text-[11px] font-semibold tracking-[0.3em] text-violet-400 uppercase">
              Säljstöd · Nils Ahlgren AB
            </p>
            <h1
              className="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              Allt du behöver
              <br />
              <span
                className="bg-gradient-to-r from-violet-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent"
              >
                på ett ställe.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-gray-300">
              Produktblad, stängselplanerare, artikeldata och streckkodsgenerator —
              samlat i ett internt verktyg för säljteamet.
            </p>
          </div>

          {/* Quick links */}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/produktblad"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-lg shadow-violet-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-400 hover:shadow-violet-400/30"
            >
              <FileText className="h-4 w-4" />
              Produktblad
            </Link>
            <Link
              href="/artikelbas"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.22]0 bg-white/[0.09] px-5 py-2.5 text-sm font-semibold text-gray-200 no-underline backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
            >
              <Database className="h-4 w-4" />
              Artikelbas
            </Link>
            <Link
              href="/nyheter"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.22]0 bg-white/[0.09] px-5 py-2.5 text-sm font-semibold text-gray-200 no-underline backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
            >
              Nyheter
            </Link>
          </div>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────────── */}
      <div
        className="px-6 py-14 sm:px-12 lg:px-16"
        style={{ background: "#0d0e18" }}
      >
        <div className="mx-auto max-w-6xl space-y-16">

          {/* ── Latest News ───────────────────────────────────── */}
          <LatestNews />

          {/* ── Bento grid ────────────────────────────────────── */}
          <div>
            <div className="mb-8 flex items-baseline gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-gray-100">
                Verktyg
              </h2>
              <span className="text-sm text-gray-500">
                {active.length + 1} tillgängliga
              </span>
            </div>

            {/* Row 1: Featured + 2 tools */}
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-1 lg:row-span-2">
                <ToolCard tool={featured} large />
              </div>
              <div className="lg:col-span-1">
                <ToolCard tool={allTools[1]} />
              </div>
              <div className="lg:col-span-1">
                <ToolCard tool={allTools[2]} />
              </div>

              {/* Row 2 continuation */}
              <div className="lg:col-span-1">
                <ToolCard tool={allTools[3]} />
              </div>
              <div className="lg:col-span-1">
                <ToolCard tool={allTools[4]} />
              </div>
            </div>

            {/* Row 3: Remaining active tools */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allTools.slice(5, 7).map((tool) => (
                <ToolCard key={tool.title} tool={tool} />
              ))}

              {/* Coming soon cluster */}
              {allTools.slice(7).map((tool) => (
                <ToolCard key={tool.title} tool={tool} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
