export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Kunder</span>
        <h1>Kundregister</h1>
        <p className="max-w-2xl text-sm text-neutral-500">
          Kundlistan är pausad eftersom Supabase har avinstallerats. När databasen åter kopplas på kommer kundinformation visas
          här igen.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/70 p-8 text-sm text-neutral-500">
        Inga kunder laddas just nu.
      </div>
    </div>
  );
}
