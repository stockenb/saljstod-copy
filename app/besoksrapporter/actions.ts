"use server";

// TODO: Reintroduce customer mutations when Supabase is restored.
export async function createCustomer(_formData: FormData) {
  throw new Error("Kundhantering är inaktiverad tills Supabase återinförs.");
}

export async function updateCustomer(_id: string, _formData: FormData) {
  throw new Error("Kundhantering är inaktiverad tills Supabase återinförs.");
}

export async function deleteCustomer(_id: string) {
  throw new Error("Kundhantering är inaktiverad tills Supabase återinförs.");
}

export async function createContact(_customerId: string, _formData: FormData) {
  throw new Error("Kundhantering är inaktiverad tills Supabase återinförs.");
}

export async function updateContact(_customerId: string, _contactId: string, _formData: FormData) {
  throw new Error("Kundhantering är inaktiverad tills Supabase återinförs.");
}

export async function deleteContact(_customerId: string, _contactId: string) {
  throw new Error("Kundhantering är inaktiverad tills Supabase återinförs.");
}
