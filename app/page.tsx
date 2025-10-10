import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowUpRight } from "lucide-react";

import { createServerClientSupabase } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
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

  let audits: any[] = [];
  if (role === "ADMIN") {
    const { data: auditData } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);
    audits = auditData ?? [];
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
    <div className="space-y-10">
      <section className="rounded-3xl border border-surface-border/80 bg-white/90 p-8 shadow-card backdrop-blur-sm dark:border-surface-dark-border/60 dark:bg-neutral-900/80">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Idag</span>
              <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
                Hej {profile?.name ?? profile?.email}!
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500 dark:text-neutral-300">
                <span>{formatDate(today)}</span>
                <span aria-hidden className="hidden sm:inline">
                  ·
                </span>
                <span className="flex items-center gap-2">
                  Roll
                  <Badge variant="neutral">{role}</Badge>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {(role === "SKRUV" || role === "ADMIN") && (
                <Link
                  href="/rapporter/ny"
                  className="inline-flex items-center justify-center gap-2 rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-card transition duration-calm ease-calm hover:bg-accent-600"
                >
                  Skapa rapport
                </Link>
              )}
              <Link
                href="/nyheter"
                className="inline-flex items-center justify-center gap-2 rounded-pill border border-primary/80 px-5 py-2.5 text-sm font-semibold text-primary transition duration-calm ease-calm hover:bg-primary-50"
              >
                Alla nyheter
              </Link>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex h-full flex-col rounded-2xl border border-surface-border/70 bg-white/90 p-5 shadow-sm transition duration-calm ease-calm hover:-translate-y-0.5 hover:shadow-card-hover dark:border-surface-dark-border/50 dark:bg-neutral-900">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Mina uppgifter</span>
              <div className="mt-3 text-3xl font-semibold text-neutral-900 dark:text-white">{upcoming.length}</div>
              <p className="mt-1 text-sm text-neutral-500">
                {upcoming.length ? "Planerade uppföljningar framöver" : "Inga planerade uppföljningar just nu."}
              </p>
              {upcoming.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {upcoming.slice(0, 2).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50/80 px-3 py-2 text-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-200">
                      <Link href={`/rapporter/${item.id}`} className="font-medium text-primary hover:underline">
                        {item.title}
                      </Link>
                      <span className="text-xs text-neutral-500">{item.next_step_due}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link href="/rapporter" className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                Gå till rapporter
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex h-full flex-col rounded-2xl border border-surface-border/70 bg-white/90 p-5 shadow-sm transition duration-calm ease-calm hover:-translate-y-0.5 hover:shadow-card-hover dark:border-surface-dark-border/50 dark:bg-neutral-900">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Senaste nyhet</span>
              {latestNews ? (
                <>
                  <Link href={`/nyheter/${latestNews.slug}`} className="mt-3 text-lg font-semibold leading-snug text-neutral-900 hover:underline dark:text-white">
                    {latestNews.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span>{formatDate(latestNews.published_at)}</span>
                    {latestNews.pinned ? <Badge variant="info">Pinnad</Badge> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {latestNews.categories?.map((c: string) => (
                      <Badge key={c}>{c}</Badge>
                    ))}
                  </div>
                  <Link href={`/nyheter/${latestNews.slug}`} className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                    Läs mer
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <p className="mt-3 text-sm text-neutral-500">Inga publicerade nyheter ännu.</p>
              )}
            </div>
            <div className="flex h-full flex-col rounded-2xl border border-surface-border/70 bg-white/90 p-5 shadow-sm transition duration-calm ease-calm hover:-translate-y-0.5 hover:shadow-card-hover dark:border-surface-dark-border/50 dark:bg-neutral-900">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Snabblänkar</span>
              <div className="mt-3 flex flex-col gap-2">
                {quickLinks.slice(0, 3).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-surface-border/80 bg-white/80 px-4 py-3 text-left text-sm text-neutral-700 transition duration-calm ease-calm hover:border-primary hover:text-primary dark:border-surface-dark-border/60 dark:bg-neutral-900/80 dark:text-neutral-200"
                  >
                    <span>
                      <span className="block font-semibold text-neutral-900 group-hover:text-primary dark:text-white">{link.label}</span>
                      <span className="text-xs text-neutral-500 group-hover:text-primary/80 dark:text-neutral-400">{link.description}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-neutral-400 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex h-full flex-col rounded-2xl border border-surface-border/70 bg-white/90 p-5 shadow-sm transition duration-calm ease-calm hover:-translate-y-0.5 hover:shadow-card-hover dark:border-surface-dark-border/50 dark:bg-neutral-900">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Nyckeltal</span>
              <div className="mt-3 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                {(role === "SKRUV" || role === "ADMIN") && (
                  <>
                    <div className="flex items-center justify-between rounded-2xl bg-success-subtle/60 px-4 py-3 text-success">
                      <span className="font-semibold text-success">Kunder</span>
                      <span className="text-base font-semibold">{customerCount ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-primary-50/80 px-4 py-3 text-primary">
                      <span className="font-semibold">Rapporter</span>
                      <span className="text-base font-semibold">{reportCount ?? 0}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between rounded-2xl bg-neutral-100/80 px-4 py-3 text-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-100">
                  <span className="font-semibold">Inloggad som</span>
                  <span className="text-sm font-medium">{profile?.email}</span>
                </div>
              </div>
              <Link href="/profil" className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                Visa profil
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-8">
          {(role === "SKRUV" || role === "ADMIN") && (
            <Card>
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Besöksrapporter</CardTitle>
                  <CardDescription>Hantera kunder och följ upp nästa steg.</CardDescription>
                </div>
                <div className="flex gap-3 text-sm text-neutral-500">
                  <span className="rounded-pill bg-neutral-100 px-3 py-1 font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    {customerCount ?? 0} kunder
                  </span>
                  <span className="rounded-pill bg-neutral-100 px-3 py-1 font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                    {reportCount ?? 0} rapporter
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Link
                    href="/besoksrapporter"
                    className="group flex flex-col gap-2 rounded-2xl border border-surface-border/70 bg-white/90 p-5 transition duration-calm ease-calm hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover dark:border-surface-dark-border/60 dark:bg-neutral-900/80"
                  >
                    <span className="text-sm font-semibold text-neutral-900 group-hover:text-primary dark:text-white">Kundregister</span>
                    <span className="text-sm text-neutral-500 group-hover:text-primary/80">
                      Se befintliga kunder och lägg till nya poster.
                    </span>
                  </Link>
                  <Link
                    href="/rapporter"
                    className="group flex flex-col gap-2 rounded-2xl border border-surface-border/70 bg-white/90 p-5 transition duration-calm ease-calm hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover dark:border-surface-dark-border/60 dark:bg-neutral-900/80"
                  >
                    <span className="text-sm font-semibold text-neutral-900 group-hover:text-primary dark:text-white">Rapporter</span>
                    <span className="text-sm text-neutral-500 group-hover:text-primary/80">
                      Samlad vy över alla besöksrapporter och status.
                    </span>
                  </Link>
                </div>
                <div>
                  <div className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Kommande uppföljningar</div>
                  {upcoming.length ? (
                    <ul className="space-y-2 text-sm">
                      {upcoming.map((item) => (
                        <li key={item.id} className="group flex items-center justify-between gap-4 rounded-2xl border border-surface-border/70 bg-white/90 px-4 py-3 transition duration-calm ease-calm hover:border-primary hover:shadow-card-hover dark:border-surface-dark-border/60 dark:bg-neutral-900/80">
                          <div>
                            <Link href={`/rapporter/${item.id}`} className="font-medium text-neutral-900 group-hover:text-primary dark:text-white">
                              {item.title}
                            </Link>
                            <p className="text-xs text-neutral-500">{item.customer}</p>
                          </div>
                          <span className="text-xs font-medium text-neutral-500">{item.next_step_due}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-neutral-500">Inga planerade uppföljningar.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {role === "STANGSEL" && (
            <Card>
              <CardHeader>
                <CardTitle>Skapa offert</CardTitle>
                <CardDescription>Stödet för offertskapande lanseras snart.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-500">Kommer snart</p>
              </CardContent>
              <CardFooter>
                <Link href="/nyheter" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                  Håll dig uppdaterad via nyheterna
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </CardFooter>
            </Card>
          )}

          {role === "ADMIN" && (
            <Card>
              <CardHeader>
                <CardTitle>Senaste aktivitet</CardTitle>
                <CardDescription>Överblick över senaste händelser i systemet.</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm">
                  {audits.length ? (
                    audits.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-4 rounded-2xl border border-surface-border/70 bg-white/90 px-4 py-3 text-neutral-700 dark:border-surface-dark-border/60 dark:bg-neutral-900/80 dark:text-neutral-200">
                        <span>
                          <span className="font-semibold text-neutral-900 dark:text-white">{a.action}</span> · {a.entity}
                          {a.entity_id ? ` #${a.entity_id}` : ""}
                        </span>
                        <span className="text-xs font-medium text-neutral-500">{formatDate(a.created_at)}</span>
                      </li>
                    ))
                  ) : (
                    <p className="text-neutral-500">Ingen aktivitet registrerad.</p>
                  )}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nyheter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {latestNews ? (
                <article className="space-y-4">
                  <header className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {latestNews.categories?.map((c: string) => (
                        <Badge key={c}>{c}</Badge>
                      ))}
                      {latestNews.pinned ? <Badge variant="info">Pinnad</Badge> : null}
                    </div>
                    <Link href={`/nyheter/${latestNews.slug}`} className="text-xl font-semibold leading-tight text-neutral-900 hover:text-primary hover:underline dark:text-white">
                      {latestNews.title}
                    </Link>
                    <p className="text-xs text-neutral-500">{formatDate(latestNews.published_at)}</p>
                  </header>
                  <ReactMarkdown className="prose prose-sm max-w-none text-neutral-600 dark:text-neutral-300">
                    {latestNews.content}
                  </ReactMarkdown>
                </article>
              ) : (
                <p className="text-sm text-neutral-500">Inga nyheter än.</p>
              )}
            </CardContent>
          </Card>

          {olderNews.length ? (
            <div className="grid gap-4">
              {olderNews.map((item) => (
                <Card key={item.id} className="border border-surface-border/80 bg-white/90 p-0 transition duration-calm ease-calm hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover dark:border-surface-dark-border/60 dark:bg-neutral-900/80">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.categories?.map((c: string) => (
                        <Badge key={c} variant="neutral">
                          {c}
                        </Badge>
                      ))}
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-white">{item.title}</div>
                      <p className="text-xs text-neutral-500">{formatDate(item.published_at)}</p>
                    </div>
                    <Link
                      href={`/nyheter/${item.slug}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
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
