import Link from "next/link";

import { createServerClientSupabase } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createCustomer } from "./actions";

export default async function CustomersPage() {
  const supabase = createServerClientSupabase();
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Kundregister</h1>
          <p className="text-sm text-neutral-500">Se och hantera dina kunder inför besök och uppföljningar.</p>
        </header>

        <div className="space-y-3">
          {customers?.length ? (
            customers.map((customer) => (
              <Card key={customer.id} className="border border-neutral-200">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <Link href={`/besoksrapporter/${customer.id}`} className="text-lg font-semibold hover:underline">
                        {customer.name}
                      </Link>
                      <p className="text-sm text-neutral-500">
                        {customer.address_line ? `${customer.address_line}, ` : ""}
                        {customer.postal_code ? `${customer.postal_code} ` : ""}
                        {customer.city ?? ""}
                      </p>
                      <p className="text-xs text-neutral-500">Skapad {formatDate(customer.created_at)}</p>
                    </div>
                    <div className="space-y-1 text-sm text-neutral-600">
                      {customer.email ? <div>{customer.email}</div> : null}
                      {customer.phone ? <div>{customer.phone}</div> : null}
                    </div>
                  </div>
                  {customer.notes ? (
                    <p className="mt-3 text-sm text-neutral-600">{customer.notes}</p>
                  ) : null}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-neutral-500">Inga kunder registrerade ännu.</CardContent>
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
            <form action={create} className="space-y-3">
              <div>
                <label className="text-sm">Företagsnamn</label>
                <Input name="name" required placeholder="Ex: Kund AB" />
              </div>
              <div>
                <label className="text-sm">Organisationsnummer</label>
                <Input name="org_number" placeholder="Ex: 559999-1234" />
              </div>
              <div>
                <label className="text-sm">Adress</label>
                <Input name="address_line" placeholder="Gatuadress" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Postnummer</label>
                  <Input name="postal_code" placeholder="123 45" />
                </div>
                <div>
                  <label className="text-sm">Ort</label>
                  <Input name="city" placeholder="Ort" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">E-post</label>
                  <Input type="email" name="email" placeholder="kontakt@kund.se" />
                </div>
                <div>
                  <label className="text-sm">Telefon</label>
                  <Input name="phone" placeholder="08-123 45 67" />
                </div>
              </div>
              <div>
                <label className="text-sm">Anteckningar</label>
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
