import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowUpRight } from "lucide-react";

import { createServerClientSupabase } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const role = profile?.role;

  const { data: news } = await supabase
    .from("news_items")
    .select("id, title, slug, content, categories, pinned, published_at")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(6);

  let upcoming: any[] = [];
  let customerCount: number | null = null;
  let reportCount: number | null = null;
  if (role === "SKRUV" || role === "ADMIN") {
    const { data: upcomingData } = await supabase

      .from("visit_reports")
      .select("id,title,customer,next_step_due")
      .gte("next_step_due", new Date().toISOString().slice(0, 10))
      .order("next_step_due", { ascending: true })
      .limit(4);
    upcoming = upcomingData ?? [];

    const { count: customers } = await supabase.from("customers").select("id", { count: "exact", head: true });
    const { count: reports } = await supabase.from("visit_reports").select("id", { count: "exact", head: true });
    customerCount = customers ?? 0;
    reportCount = reports ?? 0;
  }


  const latestNews = news?.[0];
  const olderNews = news?.slice(1) ?? [];
  const today = new Date();
  const quickLinks = [
    role === "SKRUV" || role === "ADMIN"
      ? {
          href: "/besoksrapporter",
          label: "Kundregister",
          description: "Hantera kunder och hitta kontaktuppgifter snabbt.",
        }
      : null,
    role === "SKRUV" || role === "ADMIN"
      ? {
          href: "/rapporter",
          label: "Rapporter",
          description: "Få överblick över alla besöksrapporter och status.",
        }
      : null,
    {
      href: "/nyheter",
      label: "Nyheter",
      description: "Se alla uppdateringar från organisationen.",
    },
    {
      href: "/profil",
      label: "Min profil",
      description: "Uppdatera dina kontaktuppgifter och inställningar.",
    },
  ].filter(Boolean) as { href: string; label: string; description: string }[];

  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-white/95 via-white/80 to-primary-50/40 p-10 shadow-[0_35px_80px_-60px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/10 dark:from-neutral-900/90 dark:via-neutral-900/80 dark:to-neutral-900/60">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-8">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">Nils Ahlgren AB</span>
              <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">Hej {profile?.name ?? profile?.email}!</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-300">{formatDate(today)}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {(role === "SKRUV" || role === "ADMIN") && (
                <Link
                  href="/rapporter/ny"
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 ease-out hover:bg-neutral-700"
                >
                  Skapa rapport
                </Link>
              )}
              <Link
                href="/nyheter"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-5 py-2.5 text-sm font-semibold text-neutral-700 transition duration-200 ease-out hover:border-neutral-400 hover:text-neutral-900"
              >
                Alla nyheter
              </Link>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Kommande uppföljningar</p>
              {upcoming.length ? (
                <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
                  {upcoming.slice(0, 3).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 border-b border-white/60 pb-2 last:border-b-0 last:pb-0 dark:border-white/10">
                      <div>
                        <Link href={`/rapporter/${item.id}`} className="font-medium text-neutral-900 transition hover:text-primary dark:text-white">
                          {item.title}
                        </Link>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.customer}</p>
                      </div>
                      <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{item.next_step_due}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Inga planerade uppföljningar just nu.</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/60">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Planering</span>
              <div className="mt-3 text-3xl font-semibold text-neutral-900 dark:text-white">{upcoming.length}</div>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {upcoming.length ? "Planerade uppföljningar framöver" : "Inga planerade uppföljningar just nu."}
              </p>
              <Link
                href="/rapporter"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-700 transition hover:text-primary dark:text-neutral-200"
              >
                Gå till rapporter
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/60">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Senaste nyhet</span>
              {latestNews ? (
                <div className="mt-3 space-y-3">
                  <Link href={`/nyheter/${latestNews.slug}`} className="text-lg font-semibold leading-snug text-neutral-900 transition hover:text-primary dark:text-white">
                    {latestNews.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{formatDate(latestNews.published_at)}</span>
                    {latestNews.pinned ? <Badge variant="info" className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">Pinnad</Badge> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {latestNews.categories?.map((c: string) => (
                      <Badge key={c} className="bg-white/60 text-neutral-600 ring-1 ring-white/60 dark:bg-neutral-800/70 dark:text-neutral-200 dark:ring-white/10">
                        {c}
                      </Badge>
                    ))}
                  </div>
                  <Link
                    href={`/nyheter/${latestNews.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 transition hover:text-primary dark:text-neutral-200"
                  >
                    Läs mer
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">Inga publicerade nyheter ännu.</p>
              )}
            </div>
            <div className="sm:col-span-2 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/60">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Snabblänkar</span>
                  <ul className="mt-3 grid gap-2 text-sm text-neutral-600 dark:text-neutral-300 md:grid-cols-2">
                    {quickLinks.map((link) => (
                      <li key={link.href} className="group space-y-1">
                        <Link
                          href={link.href}
                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition hover:bg-white hover:text-neutral-900 dark:hover:bg-neutral-800"
                        >
                          <span className="font-medium text-neutral-700 group-hover:text-neutral-900 dark:text-neutral-200 dark:group-hover:text-white">
                            {link.label}
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 dark:text-neutral-500 dark:group-hover:text-neutral-300" />
                        </Link>
                        <p className="px-3 text-xs text-neutral-400 transition group-hover:text-neutral-500 dark:text-neutral-500">
                          {link.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                {(role === "SKRUV" || role === "ADMIN") && (
                  <div className="flex shrink-0 flex-col gap-3 rounded-2xl bg-white/60 p-4 text-sm text-neutral-600 shadow-sm ring-1 ring-white/70 dark:bg-neutral-900/70 dark:text-neutral-200 dark:ring-white/10">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Kunder</span>
                      <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">{customerCount ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Rapporter</span>
                      <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">{reportCount ?? 0}</p>
                    </div>
                    <Link href="/profil" className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-neutral-700 transition hover:text-primary dark:text-neutral-200">
                      Visa profil
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.85fr)_minmax(0,1.15fr)]">
        <div className="space-y-8">
          {(role === "SKRUV" || role === "ADMIN") && (
            <Card className="bg-white/80 shadow-none ring-1 ring-black/5 backdrop-blur-sm dark:bg-neutral-900/60 dark:ring-white/10">
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">Besöksrapporter</CardTitle>
                  <CardDescription>Hantera kunder och följ upp nästa steg.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <span className="rounded-full bg-white px-3 py-1 text-neutral-700 shadow-sm ring-1 ring-black/5 dark:bg-neutral-800/80 dark:text-neutral-200 dark:ring-white/10">
                    {customerCount ?? 0} kunder
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-neutral-700 shadow-sm ring-1 ring-black/5 dark:bg-neutral-800/80 dark:text-neutral-200 dark:ring-white/10">
                    {reportCount ?? 0} rapporter
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 text-sm text-neutral-600 dark:text-neutral-300">
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <Link
                    href="/besoksrapporter"
                    className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition hover:bg-white hover:text-neutral-900 dark:hover:bg-neutral-800"
                  >
                    <span className="font-medium text-neutral-700 group-hover:text-neutral-900 dark:text-neutral-200 dark:group-hover:text-white">
                      Kundregister
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 dark:text-neutral-500 dark:group-hover:text-neutral-300" />
                  </Link>
                  <Link
                    href="/rapporter"
                    className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition hover:bg-white hover:text-neutral-900 dark:hover:bg-neutral-800"
                  >
                    <span className="font-medium text-neutral-700 group-hover:text-neutral-900 dark:text-neutral-200 dark:group-hover:text-white">
                      Rapporter
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 dark:text-neutral-500 dark:group-hover:text-neutral-300" />
                  </Link>
                </div>
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Kommande uppföljningar</div>
                  {upcoming.length ? (
                    <ul className="divide-y divide-neutral-200/70 rounded-2xl border border-neutral-200/60 bg-white/70 text-sm shadow-sm dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900/40">
                      {upcoming.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                          <div>
                            <Link href={`/rapporter/${item.id}`} className="font-medium text-neutral-900 transition hover:text-primary dark:text-white">
                              {item.title}
                            </Link>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.customer}</p>
                          </div>
                          <span className="text-xs font-medium text-neutral-400 dark:text-neutral-500">{item.next_step_due}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Inga planerade uppföljningar.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {role === "STANGSEL" && (
            <Card className="bg-white/80 shadow-none ring-1 ring-black/5 backdrop-blur-sm dark:bg-neutral-900/60 dark:ring-white/10">
              <CardHeader>
                <CardTitle>Skapa offert</CardTitle>
                <CardDescription>Stödet för offertskapande lanseras snart.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Kommer snart</p>
              </CardContent>
              <CardFooter>
                <Link href="/nyheter" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 transition hover:text-primary dark:text-neutral-200">
                  Håll dig uppdaterad via nyheterna
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </CardFooter>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="bg-white/80 shadow-none ring-1 ring-black/5 backdrop-blur-sm dark:bg-neutral-900/60 dark:ring-white/10">
            <CardHeader>
              <CardTitle>Nyheter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {latestNews ? (
                <article className="space-y-4">
                  <header className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {latestNews.categories?.map((c: string) => (
                        <Badge key={c} className="bg-white/60 text-neutral-600 ring-1 ring-white/60 dark:bg-neutral-800/70 dark:text-neutral-200 dark:ring-white/10">
                          {c}
                        </Badge>
                      ))}
                      {latestNews.pinned ? <Badge variant="info" className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">Pinnad</Badge> : null}
                    </div>
                    <Link href={`/nyheter/${latestNews.slug}`} className="text-xl font-semibold leading-tight text-neutral-900 transition hover:text-primary dark:text-white">
                      {latestNews.title}
                    </Link>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(latestNews.published_at)}</p>
                  </header>
                  <ReactMarkdown className="prose prose-sm max-w-none text-neutral-600 dark:text-neutral-300">
                    {latestNews.content}
                  </ReactMarkdown>
                </article>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Inga nyheter än.</p>
              )}
            </CardContent>
          </Card>

          {olderNews.length ? (
            <div className="grid gap-4">
              {olderNews.map((item) => (
                <Card
                  key={item.id}
                  className="bg-white/70 p-0 shadow-none ring-1 ring-black/5 transition duration-200 ease-out hover:-translate-y-0.5 hover:ring-neutral-400/40 dark:bg-neutral-900/60 dark:ring-white/10 dark:hover:ring-white/20"
                >
                  <CardContent className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.categories?.map((c: string) => (
                        <Badge key={c} className="bg-white/60 text-neutral-600 ring-1 ring-white/60 dark:bg-neutral-800/70 dark:text-neutral-200 dark:ring-white/10">
                          {c}
                        </Badge>
                      ))}
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-white">{item.title}</div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{formatDate(item.published_at)}</p>
                    </div>
                    <Link
                      href={`/nyheter/${item.slug}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 transition hover:text-primary dark:text-neutral-200"
                    >
                      Läs mer
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
