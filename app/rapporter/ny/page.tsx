import { createReport } from "@/app/rapporter/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { redirect } from "next/navigation";

export default function NewReportPage() {
  async function action(formData: FormData) {
    "use server";
    const res = await createReport(formData);
    redirect(`/rapporter/${res.id}`);
  }

  return (
    <form action={action} className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Ny besöksrapport</h1>
      <label className="block space-y-1">
        <span className="text-sm">Titel</span>
        <Input name="title" required placeholder="Ex: Möte med kund X" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">Kund</span>
        <Input name="customer" required placeholder="Kundnamn" />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm">Plats</span>
          <Input name="location" placeholder="Plats" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Besöksdatum</span>
          <Input type="date" name="visit_date" required />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-sm">Deltagare</span>
        <Input name="attendees" placeholder="Ex: Anna, Kalle" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">Anteckningar</span>
        <Textarea name="notes" placeholder="Skriv anteckningar..." />
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm">Status</span>
          <select name="status" className="h-11 w-full rounded-2xl border border-neutral-300 px-3">
            <option>Öppet</option>
            <option>Vann</option>
            <option>Förlorat</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Taggar (komma-separerade)</span>
          <Input name="tags" placeholder="t.ex. upphandling, offert" />
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm">Nästa steg</span>
          <Input name="next_step" placeholder="Ex: Skicka offert" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Deadline för nästa steg</span>
          <Input type="date" name="next_step_due" />
        </label>
      </div>
      <Button type="submit">Spara</Button>
    </form>
  );
}
