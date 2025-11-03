"use server";

// TODO: Reintroduce report mutations when Supabase is available again.
export async function createReport(_formData: FormData) {
  throw new Error("Rapportfunktioner är inaktiverade tills Supabase återinförs.");
}

export async function updateReport(_id: string, _formData: FormData) {
  throw new Error("Rapportfunktioner är inaktiverade tills Supabase återinförs.");
}

export async function deleteReport(_id: string) {
  throw new Error("Rapportfunktioner är inaktiverade tills Supabase återinförs.");
}

export async function completeFollowUp(_id: string) {
  throw new Error("Rapportfunktioner är inaktiverade tills Supabase återinförs.");
}

export async function exportReportsToCSV(searchParams: string) {
  return searchParams;
}
