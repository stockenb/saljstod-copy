import Link from "next/link";
import { notFound } from "next/navigation";

import { createServerClientSupabase } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReportViewPage({ params }: { params: { id: string } }) {
  const supabase = createServerClientSupabase();
  const { data: report } = await supabase
    .from("visit_reports")
    .select(
      "id,title,customer,customer_address,customer_postal_code,customer_city,customer_email,customer_phone,location,visit_date,attendees,notes,status,next_step,next_step_due,tags,created_at,updated_at"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!report) return notFound();

  const pdfHref = `/api/reports/${params.id}/pdf`;

  return (
    <div className="space-y-6">
      <Link href="/rapporter" className="text-sm text-primary underline">
        ← Tillbaka till rapporter
      </Link>

      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Besöksrapport</span>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">{report.title}</h1>
          <p className="text-sm text-neutral-500">Översikt över rapporten och dess innehåll.</p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {(report.tags ?? []).map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-neutral-300 px-4 text-sm font-medium text-neutral-900"
          >
            Öppna PDF
          </a>
          <Link
            href={`/rapporter/${report.id}`}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-primary px-4 text-sm font-medium text-primary"
          >
            Redigera rapport
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sammanfattning</CardTitle>
              <CardDescription>Nyckeluppgifter om status och planerade uppföljningar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Kund</span>
                <span className="font-medium text-neutral-900 dark:text-white">{report.customer}</span>
              </div>
              <div className="flex justify-between">
                <span>Skapad</span>
                <span>{formatDate(report.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Besöksdatum</span>
                <span>{formatDate(report.visit_date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span>
                  {report.status ? (
                    <Badge variant={report.status === "Vann" ? "success" : report.status === "Förlorat" ? "danger" : "neutral"}>
                      {report.status}
                    </Badge>
                  ) : (
                    <span className="text-neutral-400">-</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Nästa steg</span>
                <span>{report.next_step ? report.next_step : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Deadline</span>
                <span>{report.next_step_due ? formatDate(report.next_step_due) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span>Senast uppdaterad</span>
                <span>{formatDate(report.updated_at)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mötesinformation</CardTitle>
              <CardDescription>Detaljer om mötet och deltagare.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500">Mötesplats</div>
                <div className="text-sm text-neutral-700 dark:text-neutral-200">{report.location || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500">Deltagare</div>
                <div className="text-sm text-neutral-700 dark:text-neutral-200">{report.attendees || "-"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anteckningar</CardTitle>
              <CardDescription>Samlad dokumentation från mötet.</CardDescription>
            </CardHeader>
            <CardContent>
              {report.notes ? (
                <p className="whitespace-pre-line">{report.notes}</p>
              ) : (
                <p className="text-sm text-neutral-500">Inga anteckningar.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Kunduppgifter</CardTitle>
            <CardDescription>Kontaktinformation kopplad till rapporten.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-500">Adress</div>
              <div className="text-neutral-700 dark:text-neutral-200">
                {report.customer_address ? `${report.customer_address}` : "-"}
              </div>
              <div className="text-neutral-500">
                {report.customer_postal_code || report.customer_city
                  ? `${report.customer_postal_code ?? ""} ${report.customer_city ?? ""}`.trim()
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-500">E-post</div>
              <div className="text-neutral-700 dark:text-neutral-200">{report.customer_email || "-"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-500">Telefon</div>
              <div className="text-neutral-700 dark:text-neutral-200">{report.customer_phone || "-"}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
