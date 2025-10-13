import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createServerClientSupabase } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  createCustomerContact,
  deleteCustomer,
  deleteCustomerContact,
  updateCustomer,
  updateCustomerContact,
} from "../actions";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClientSupabase();
  const { data: customer } = await supabase
    .from("customers")
    .select("id,name,org_number,address_line,postal_code,city,email,phone,notes,created_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!customer) return notFound();

  const { data: reports } = await supabase
    .from("visit_reports")
    .select("id,title,status,next_step,next_step_due,visit_date,updated_at")
    .eq("customer_id", params.id)
    .order("visit_date", { ascending: false });

  const { data: contacts } = await supabase
    .from("customer_contacts")
    .select("id,name,role,email,phone,created_at,updated_at")
    .eq("customer_id", params.id)
    .order("name", { ascending: true });

  async function update(formData: FormData) {
    "use server";
    await updateCustomer(params.id, formData);
  }

  async function remove() {
    "use server";
    await deleteCustomer(params.id);
    redirect("/besoksrapporter");
  }

  async function addContact(formData: FormData) {
    "use server";
    await createCustomerContact(params.id, formData);
  }

  async function saveContact(contactId: string, formData: FormData) {
    "use server";
    await updateCustomerContact(params.id, contactId, formData);
  }

  async function removeContact(contactId: string) {
    "use server";
    await deleteCustomerContact(params.id, contactId);
  }

  return (
    <div className="space-y-6">
      <Link href="/besoksrapporter" className="text-sm text-primary underline">
        ← Tillbaka till kundlistan
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{customer.name}</CardTitle>
            <CardDescription>Uppdatera kunduppgifter så fylls rapporter med rätt information.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={update} className="space-y-3">
              <div>
                <label className="text-sm">Företagsnamn</label>
                <Input name="name" defaultValue={customer.name} required />
              </div>
              <div>
                <label className="text-sm">Organisationsnummer</label>
                <Input name="org_number" defaultValue={customer.org_number ?? ""} />
              </div>
              <div>
                <label className="text-sm">Adress</label>
                <Input name="address_line" defaultValue={customer.address_line ?? ""} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Postnummer</label>
                  <Input name="postal_code" defaultValue={customer.postal_code ?? ""} />
                </div>
                <div>
                  <label className="text-sm">Ort</label>
                  <Input name="city" defaultValue={customer.city ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">E-post</label>
                  <Input type="email" name="email" defaultValue={customer.email ?? ""} />
                </div>
                <div>
                  <label className="text-sm">Telefon</label>
                  <Input name="phone" defaultValue={customer.phone ?? ""} />
                </div>
              </div>
              <div>
                <label className="text-sm">Anteckningar</label>
                <Textarea name="notes" defaultValue={customer.notes ?? ""} rows={4} />
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
                <Button formAction={remove} variant="ghost" type="submit">
                  Ta bort kund
                </Button>
                <Button type="submit">Spara ändringar</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Snabbinfo</CardTitle>
            <CardDescription>Sammanfattning för att ha koll inför nästa kontakt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-600">
            <div className="flex justify-between">
              <span>Skapad</span>
              <span>{formatDate(customer.created_at)}</span>
            </div>
            {customer.email ? (
              <div className="flex justify-between">
                <span>E-post</span>
                <span>{customer.email}</span>
              </div>
            ) : null}
            {customer.phone ? (
              <div className="flex justify-between">
                <span>Telefon</span>
                <span>{customer.phone}</span>
              </div>
            ) : null}
            {customer.org_number ? (
              <div className="flex justify-between">
                <span>Org.nr</span>
                <span>{customer.org_number}</span>
              </div>
            ) : null}
          </CardContent>
          <CardContent>
            <Link
              href={`/rapporter/ny?customer_id=${customer.id}`}
              className="inline-flex w-full justify-center rounded-2xl border border-primary px-4 py-2 text-sm font-medium text-primary"
            >
              Skapa besöksrapport
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referenspersoner</CardTitle>
            <CardDescription>Nyckelkontakter hos kunden.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {contacts?.length ? (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <form
                    key={contact.id}
                    action={saveContact.bind(null, contact.id)}
                    className="space-y-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-700"
                  >
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Namn</label>
                      <Input name="name" defaultValue={contact.name} required />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Roll</label>
                        <Input name="role" defaultValue={contact.role ?? ""} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Telefon</label>
                        <Input name="phone" defaultValue={contact.phone ?? ""} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">E-post</label>
                      <Input type="email" name="email" defaultValue={contact.email ?? ""} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm">
                        Spara
                      </Button>
                      <Button
                        formAction={removeContact.bind(null, contact.id)}
                        formMethod="post"
                        formNoValidate
                        type="submit"
                        variant="ghost"
                        size="sm"
                      >
                        Ta bort
                      </Button>
                    </div>
                  </form>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">Inga referenspersoner tillagda ännu.</p>
            )}

            <div className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Lägg till referensperson</h3>
              <form action={addContact} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Namn</label>
                  <Input name="name" required placeholder="Namn" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Roll</label>
                    <Input name="role" placeholder="Roll" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Telefon</label>
                    <Input name="phone" placeholder="08-123 45 67" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">E-post</label>
                  <Input type="email" name="email" placeholder="namn@kund.se" />
                </div>
                <Button type="submit" size="sm">
                  Lägg till
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Besöksrapporter</CardTitle>
          <CardDescription>Följ upp tidigare möten och skapa nya.</CardDescription>
        </CardHeader>
        <CardContent>
          {reports?.length ? (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-col gap-2 rounded-2xl border border-neutral-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <Link href={`/rapporter/${report.id}`} className="font-medium hover:underline">
                      {report.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <Badge variant="outline">{report.status}</Badge>
                      {report.next_step_due ? <span>Nästa steg: {report.next_step_due}</span> : null}
                      <span>Besök: {formatDate(report.visit_date)}</span>
                      <span>Senast uppdaterad: {formatDate(report.updated_at)}</span>
                    </div>
                  </div>
                  {report.next_step ? <p className="text-sm text-neutral-600">{report.next_step}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Inga rapporter registrerade ännu.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
