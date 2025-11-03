export default function ReportsListPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Rapporter</span>
        <h1>Besöksrapporter</h1>
        <p className="text-sm text-neutral-500">
          Rapportlistan är för närvarande inaktiverad eftersom Supabase och autentisering har tagits bort. När backend kopplas på
          igen kommer rapporterna visas här.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/70 p-8 text-sm text-neutral-500">
        Ingen rapportdata laddas just nu.
      </div>
    </div>
  );
}
