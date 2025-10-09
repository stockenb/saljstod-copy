import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createServerClientSupabase } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { completeFollowUp, deleteReport, updateReport } from "@/app/rapporter/actions";
import { formatDate } from "@/lib/utils";

export default async function ReportDetail({ params }: { params: { id: string } }) {
  const supabase = createServerClientSupabase();
  const { data: report } = await supabase.from("visit_reports").select("*").eq("id", params.id).maybeSingle();
  if (!report) return notFound();

  const { data: customers } = await supabase.from("customers").select("id,name").order("name", { ascending: true });

  async function action(formData: FormData) {
    "use server";
    await updateReport(params.id, formData);
  }

  async function del() {
    "use server";
    await deleteReport(params.id);
    redirect("/rapporter");
  }

  async function complete() {
    "use server";
    await completeFollowUp(params.id);
  }

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("entity", "visit_reports")
    .eq("entity_id", params.id)
    .order("created_at", { ascending: false });

  const pdfHref = `/api/reports/${params.id}/pdf`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form action={action} className="space-y-5 lg:col-span-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold">Redigera rapport</h1>
          <div className="flex gap-2">
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-neutral-300 px-4 text-sm font-medium text-neutral-900"
            >
              Exportera PDF
            </a>
            <Link
              href={report.customer_id ? `/rapporter/ny?customer_id=${report.customer_id}` : "/rapporter/ny"}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-neutral-300 px-4 text-sm font-medium text-neutral-900"
            >
              Ny rapport från kund
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm">Välj kund</span>
            <select
              name="customer_id"
              defaultValue={report.customer_id ?? ""}
              className="h-11 w-full rounded-2xl border border-neutral-300 px-3"
            >
              <option value="">Manuell</option>
              {customers?.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Titel</span>
            <Input name="title" defaultValue={report.title} required />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm">Kundnamn</span>
            <Input name="customer" defaultValue={report.customer} required />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Kundens e-post</span>
            <Input name="customer_email" defaultValue={report.customer_email ?? ""} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block space-y-1 md:col-span-2">
            <span className="text-sm">Adress</span>
            <Input name="customer_address" defaultValue={report.customer_address ?? ""} />
          </label>
          <label className="block space-y-1 md:col-span-1">
            <span className="text-sm">Telefon</span>
            <Input name="customer_phone" defaultValue={report.customer_phone ?? ""} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-sm">Postnummer</span>
            <Input name="customer_postal_code" defaultValue={report.customer_postal_code ?? ""} />
          </label>
          <label className="block space-y-1 md:col-span-2">
            <span className="text-sm">Ort</span>
            <Input name="customer_city" defaultValue={report.customer_city ?? ""} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm">Mötesplats</span>
            <Input name="location" defaultValue={report.location ?? ""} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Besöksdatum</span>
            <Input type="date" name="visit_date" defaultValue={report.visit_date?.slice(0, 10)} />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm">Deltagare</span>
          <Input name="attendees" defaultValue={report.attendees ?? ""} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Anteckningar</span>
          <Textarea name="notes" defaultValue={report.notes ?? ""} />
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm">Status</span>
            <select name="status" defaultValue={report.status} className="h-11 w-full rounded-2xl border border-neutral-300 px-3">
              <option>Öppet</option>
              <option>Vann</option>
              <option>Förlorat</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Taggar (komma-separerade)</span>
            <Input name="tags" defaultValue={(report.tags ?? []).join(", ")} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm">Nästa steg</span>
            <Input name="next_step" defaultValue={report.next_step ?? ""} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Deadline för nästa steg</span>
            <Input type="date" name="next_step_due" defaultValue={report.next_step_due ?? ""} />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">Spara</Button>
          <Button formAction={del} formMethod="post" formNoValidate variant="destructive">
            Ta bort
          </Button>
          <Button formAction={complete} formMethod="post" formNoValidate variant="outline">
            Markera uppföljning klar
          </Button>
        </div>
      </form>

      <aside>
        <h2 className="mb-3 text-lg font-semibold">Tidslinje</h2>
        <div className="space-y-3">
          {logs?.length ? (
            logs.map((l) => (
              <div key={l.id} className="border-l-2 border-primary pl-3">
                <div className="text-sm">
                  <span className="font-medium">{l.action}</span> – {formatDate(l.created_at)}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-500">Ingen historik.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
