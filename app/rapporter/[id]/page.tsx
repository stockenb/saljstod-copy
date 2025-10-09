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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form action={action} className="lg:col-span-2 space-y-4">
        <h1 className="text-2xl font-semibold">Redigera rapport</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm">Titel</span>
            <Input name="title" defaultValue={report.title} required />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Kund</span>
            <Input name="customer" defaultValue={report.customer} required />
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm">Plats</span>
            <Input name="location" defaultValue={report.location ?? ""} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Besöksdatum</span>
            <Input type="date" name="visit_date" defaultValue={report.visit_date?.slice(0,10)} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm">Nästa steg</span>
            <Input name="next_step" defaultValue={report.next_step ?? ""} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Deadline för nästa steg</span>
            <Input type="date" name="next_step_due" defaultValue={report.next_step_due ?? ""} />
          </label>
        </div>
        <div className="flex gap-2">
  {/* Standard submit går till action(formData) = update */}
  <Button type="submit">Spara</Button>

  {/* Anropa server actions direkt utan att submitta hela formuläret */}
  <Button formAction={del} formMethod="post" formNoValidate variant="destructive">
    Ta bort
  </Button>
  <Button formAction={complete} formMethod="post" formNoValidate variant="outline">
    Markera uppföljning klar
  </Button>
</div>

      </form>
      <aside>
        <h2 className="text-lg font-semibold mb-3">Tidslinje</h2>
        <div className="space-y-3">
          {logs?.length ? logs.map((l) => (
            <div key={l.id} className="border-l-2 border-primary pl-3">
              <div className="text-sm"><span className="font-medium">{l.action}</span> – {formatDate(l.created_at)}</div>
            </div>
          )) : <p className="text-sm text-neutral-500">Ingen historik.</p>}
        </div>
      </aside>
    </div>
  );
}
