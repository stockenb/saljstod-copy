import Link from "next/link";

import { getSupabaseServer } from "@/lib/supabase/serverClient";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createCustomer } from "./actions";

export default async function CustomersPage() {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: customers } = await supabase
    .from("customers")
    .select("id,name,city,postal_code,address_line,email,phone,notes,created_at")
    .order("name", { ascending: true });

  async function create(formData: FormData) {
    "use server";
    await createCustomer(formData);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      <section className="space-y-6">
        <header className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Kunder</span>
          <h1>Kundregister</h1>
          <p className="max-w-2xl text-sm text-neutral-500">
            Se och hantera dina kunder inför besök och uppföljningar. Klicka på en kund för att öppna detaljer och rapporter.
          </p>
        </header>

        <div className="space-y-4">
          {customers?.length ? (
            customers.map((customer) => (
              <Card
                key={customer.id}
                className="border border-surface-border/80 bg-white/90 p-0 transition duration-calm ease-calm hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover dark:border-surface-dark-border/60 dark:bg-neutral-900/80"
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <Link
                        href={`/besoksrapporter/${customer.id}`}
                        className="text-lg font-semibold leading-snug text-neutral-900 hover:text-primary hover:underline dark:text-white"
                      >
                        {customer.name}
                      </Link>
                      <div className="text-sm text-neutral-500">
                        {customer.address_line ? `${customer.address_line}, ` : ""}
                        {customer.postal_code ? `${customer.postal_code} ` : ""}
                        {customer.city ?? ""}
                      </div>
                      <div className="text-xs text-neutral-400">Skapad {formatDate(customer.created_at)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
                      {customer.email ? (
                        <span className="pill-chip">{customer.email}</span>
                      ) : null}
                      {customer.phone ? (
                        <span className="pill-chip">{customer.phone}</span>
                      ) : null}
                    </div>
                  </div>
                  {customer.notes ? (
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">{customer.notes}</p>
                  ) : null}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-sm text-neutral-500">Inga kunder registrerade ännu.</CardContent>
            </Card>
          )}
        </div>
      </section>

      <aside>
        <Card>
          <CardHeader>
            <CardTitle>Ny kund</CardTitle>
            <CardDescription>Lägg till en kund innan du skapar din besöksrapport.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={create} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Företagsnamn</label>
                <Input name="name" required placeholder="Ex: Kund AB" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Organisationsnummer</label>
                <Input name="org_number" placeholder="Ex: 559999-1234" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Adress</label>
                <Input name="address_line" placeholder="Gatuadress" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Postnummer</label>
                  <Input name="postal_code" placeholder="123 45" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ort</label>
                  <Input name="city" placeholder="Ort" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">E-post</label>
                  <Input type="email" name="email" placeholder="kontakt@kund.se" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Telefon</label>
                  <Input name="phone" placeholder="08-123 45 67" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Anteckningar</label>
                <Textarea name="notes" placeholder="Övrig information" rows={4} />
              </div>
              <Button type="submit" className="w-full">
                Spara kund
              </Button>
            </form>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
