import { redirect } from "next/navigation";

import { getSupabaseServer } from "@/lib/supabase/serverClient";
import { createReport } from "@/app/rapporter/actions";

import { NewReportForm } from "./report-form";

export default async function NewReportPage({ searchParams }: { searchParams: { customer_id?: string } }) {
  const supabase = getSupabaseServer();
  const { data: customers } = await supabase
    .from("customers")
    .select("id,name,address_line,postal_code,city,email,phone")
    .order("name", { ascending: true });

  const selectedCustomer = customers?.find((c) => c.id === searchParams.customer_id) ?? null;

  async function action(formData: FormData) {
    "use server";
    const res = await createReport(formData);
    redirect(`/rapporter/${res.id}`);
  }

  return (
    <NewReportForm
      action={action}
      customers={customers ?? []}
      selectedCustomer={selectedCustomer}
    />
  );
}
