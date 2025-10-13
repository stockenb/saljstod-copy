"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Customer = {
  id: string;
  name: string;
  address_line: string | null;
  postal_code: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  customers: Customer[];
  selectedCustomer: Customer | null;
};

export function NewReportForm({ action, customers, selectedCustomer }: Props) {
  const [customerId, setCustomerId] = useState(selectedCustomer?.id ?? "");
  const [customerName, setCustomerName] = useState(selectedCustomer?.name ?? "");
  const [customerAddress, setCustomerAddress] = useState(selectedCustomer?.address_line ?? "");
  const [postalCode, setPostalCode] = useState(selectedCustomer?.postal_code ?? "");
  const [city, setCity] = useState(selectedCustomer?.city ?? "");
  const [customerEmail, setCustomerEmail] = useState(selectedCustomer?.email ?? "");
  const [customerPhone, setCustomerPhone] = useState(selectedCustomer?.phone ?? "");
  const [location, setLocation] = useState(selectedCustomer?.address_line ?? "");

  useEffect(() => {
    const next = customers.find((c) => c.id === customerId);
    if (next) {
      setCustomerName(next.name ?? "");
      setCustomerAddress(next.address_line ?? "");
      setPostalCode(next.postal_code ?? "");
      setCity(next.city ?? "");
      setCustomerEmail(next.email ?? "");
      setCustomerPhone(next.phone ?? "");
      setLocation(next.address_line ?? "");
    } else {
      setCustomerName("");
      setCustomerAddress("");
      setPostalCode("");
      setCity("");
      setCustomerEmail("");
      setCustomerPhone("");
      setLocation("");
    }
  }, [customerId, customers]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <form action={action} className="space-y-6 max-w-3xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Ny besöksrapport</h1>
        <p className="text-sm text-neutral-500">Fyll i mötesdetaljer och kunduppgifter.</p>
      </header>

      <section className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Välj kund</label>
            <select
              className="h-11 w-full rounded-2xl border border-neutral-300 px-3"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Välj kund eller fyll i manuellt</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm">Titel</label>
            <Input name="title" required placeholder="Ex: Möte med kund X" />
          </div>
        </div>

        <Input type="hidden" name="customer_id" value={customerId} readOnly />

        <div>
          <label className="text-sm">Kundnamn</label>
          <Input
            name="customer"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Kundnamn"
          />
        </div>
        <div>
          <label className="text-sm">Adress</label>
          <Input
            name="customer_address"
            value={customerAddress ?? ""}
            onChange={(e) => setCustomerAddress(e.target.value)}
            placeholder="Gatuadress"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="text-sm">Postnummer</label>
            <Input
              name="customer_postal_code"
              value={postalCode ?? ""}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="123 45"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Ort</label>
            <Input name="customer_city" value={city ?? ""} onChange={(e) => setCity(e.target.value)} placeholder="Ort" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Kundens e-post</label>
            <Input
              type="email"
              name="customer_email"
              value={customerEmail ?? ""}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="kontakt@kund.se"
            />
          </div>
          <div>
            <label className="text-sm">Kundens telefon</label>
            <Input
              name="customer_phone"
              value={customerPhone ?? ""}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="08-123 45 67"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Mötesplats</label>
            <Input
              name="location"
              value={location ?? ""}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Plats"
            />
          </div>
          <div>
            <label className="text-sm">Besöksdatum</label>
            <Input type="date" name="visit_date" defaultValue={today} required />
          </div>
        </div>
        <div>
          <label className="text-sm">Deltagare</label>
          <Input name="attendees" placeholder="Ex: Anna, Kalle" />
        </div>
        <div>
          <label className="text-sm">Anteckningar</label>
          <Textarea name="notes" placeholder="Skriv anteckningar..." rows={4} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Status</label>
            <select name="status" className="h-11 w-full rounded-2xl border border-neutral-300 px-3" defaultValue="">
              <option value="">Ingen status</option>
              <option>Öppet</option>
              <option>Vann</option>
              <option>Förlorat</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Taggar (komma-separerade)</label>
            <Input name="tags" placeholder="t.ex. upphandling, offert" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Nästa steg</label>
            <Input name="next_step" placeholder="Ex: Skicka offert" />
          </div>
          <div>
            <label className="text-sm">Deadline för nästa steg</label>
            <Input type="date" name="next_step_due" />
          </div>
        </div>
      </section>

      <Button type="submit">Spara</Button>
    </form>
  );
}
