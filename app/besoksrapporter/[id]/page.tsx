export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Kunder</span>
      <h1>Kund {params.id}</h1>
      <p className="text-sm text-neutral-500">
        Kunddetaljer är inte tillgängliga utan Supabase. Återaktivera integrationen för att se rapporter och kontaktuppgifter.
      </p>
    </div>
  );
}
