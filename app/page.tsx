import Link from "next/link";
import ReactMarkdown from "react-markdown";

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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Välkommen {profile?.name ?? profile?.email}</h1>
          <p className="text-neutral-500 text-sm">
            {formatDate(new Date())} · Roll: <span className="font-medium">{role}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {(role === "SKRUV" || role === "ADMIN") && (
            <Link className="underline" href="/rapporter/ny">
              Skapa rapport
            </Link>
          )}
          <Link className="underline" href="/nyheter">
            Alla nyheter
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)]">
        <div className="space-y-6">
          {(role === "SKRUV" || role === "ADMIN") && (
            <Card>
              <CardHeader className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Besöksrapporter</CardTitle>
                  <CardDescription>Hantera kunder och följ upp nästa steg.</CardDescription>
                </div>
                <div className="flex gap-2 text-sm text-neutral-600">
                  <span>{customerCount ?? 0} kunder</span>
                  <span className="hidden md:inline" aria-hidden>
                    ·
                  </span>
                  <span>{reportCount ?? 0} rapporter</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Link href="/besoksrapporter" className="card border border-neutral-200 p-4 rounded-2xl hover:border-primary">
                    <div className="text-sm font-medium">Kundregister</div>
                    <p className="text-sm text-neutral-500">Se befintliga kunder och lägg till nya.</p>
                  </Link>
                  <Link href="/rapporter" className="card border border-neutral-200 p-4 rounded-2xl hover:border-primary">
                    <div className="text-sm font-medium">Rapporter</div>
                    <p className="text-sm text-neutral-500">Samlad vy över alla besöksrapporter.</p>
                  </Link>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium text-neutral-700">Kommande uppföljningar</div>
                  {upcoming.length ? (
                    <ul className="space-y-2">
                      {upcoming.map((item) => (
                        <li key={item.id} className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                          <Link href={`/rapporter/${item.id}`} className="font-medium hover:underline">
                            {item.title}
                          </Link>
                          <span className="text-neutral-500">{item.next_step_due}</span>
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
                <Link href="/nyheter" className="text-sm text-primary underline">
                  Håll dig uppdaterad via nyheterna
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
                      <li key={a.id} className="flex justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2">
                        <span>
                          <span className="font-medium">{a.action}</span> · {a.entity}
                          {a.entity_id ? ` #${a.entity_id}` : ""}
                        </span>
                        <span className="text-neutral-500">{formatDate(a.created_at)}</span>
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

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nyheter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {latestNews ? (
                <article className="space-y-3">
                  <header className="space-y-2">
                    <div className="flex items-center gap-2">
                      {latestNews.categories?.map((c: string) => (
                        <Badge key={c}>{c}</Badge>
                      ))}
                      {latestNews.pinned ? <Badge className="border-primary text-primary">Pinnad</Badge> : null}
                    </div>
                    <Link href={`/nyheter/${latestNews.slug}`} className="text-xl font-semibold hover:underline">
                      {latestNews.title}
                    </Link>
                    <p className="text-xs text-neutral-500">{formatDate(latestNews.published_at)}</p>
                  </header>
                  <ReactMarkdown className="prose prose-sm max-w-none">{latestNews.content}</ReactMarkdown>
                </article>
              ) : (
                <p className="text-sm text-neutral-500">Inga nyheter än.</p>
              )}
            </CardContent>
          </Card>

          {olderNews.length ? (
            <div className="grid gap-3">
              {olderNews.map((item) => (
                <Card key={item.id} className="border border-neutral-200 hover:border-primary">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      {item.categories?.map((c: string) => (
                        <Badge key={c} variant="outline">
                          {c}
                        </Badge>
                      ))}
                    </div>
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <p className="text-xs text-neutral-500">{formatDate(item.published_at)}</p>
                    </div>
                    <Link
                      href={`/nyheter/${item.slug}`}
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                    >
                      Läs mer
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
