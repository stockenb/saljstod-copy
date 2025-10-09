import { createServerClientSupabase } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = createServerClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const today = new Date();

  const { data: news } = await supabase
    .from("news_items")
    .select("id, title, slug, categories, pinned, published_at, news_reads!left(*)")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(5);

  const { data: audits } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: upcoming } = await supabase
    .from("visit_reports")
    .select("id,title,customer,next_step_due")
    .gte("next_step_due", new Date().toISOString().slice(0,10))
    .order("next_step_due", { ascending: true })
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Välkommen {profile?.name ?? profile?.email}</h1>
          <p className="text-neutral-500 text-sm">
            {formatDate(today)} · Roll: <span className="font-medium">{profile?.role}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="underline" href="/rapporter/ny">Skapa rapport</Link>
          <Link className="underline" href="/nyheter">Alla nyheter</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nyheter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {news?.length ? news.map((n) => (
                <div key={n.id} className="flex items-center justify-between">
                  <div>
                    <Link href={"/nyheter/" + n.slug} className="font-medium hover:underline">
                      {n.title}
                    </Link>
                    <div className="mt-1 flex gap-2">
                      {n.categories?.map((c: string) => (
                        <Badge key={c}>{c}</Badge>
                      ))}
                      {n.pinned ? <Badge className="border-primary text-primary">Pinnad</Badge> : null}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-500">{formatDate(n.published_at)}</span>
                </div>
              )) : <p className="text-sm text-neutral-500">Inga nyheter än.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kommande uppföljningar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcoming?.length ? upcoming.map((u) => (
                <div key={u.id} className="flex items-center justify-between">
                  <div>
                    <Link href={"/rapporter/" + u.id} className="hover:underline">{u.title} — {u.customer}</Link>
                  </div>
                  <span className="text-xs text-neutral-500">{u.next_step_due}</span>
                </div>
              )) : <p className="text-sm text-neutral-500">Inga planerade uppföljningar.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Senaste aktivitet</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {audits?.length ? audits.map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="font-medium">{a.action}</span> · {a.entity}{a.entity_id ? ` #${a.entity_id}` : ""} · <span className="text-neutral-500">{formatDate(a.created_at)}</span>
                </li>
              )) : <p className="text-sm text-neutral-500">Ingen aktivitet registrerad.</p>}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
