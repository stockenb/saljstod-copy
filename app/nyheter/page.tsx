export default function NewsListPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Aktuellt</span>
        <h1>Nyheter</h1>
        <p className="max-w-2xl text-sm text-neutral-500">
          Nyhetsflödet är pausat medan Supabase och autentisering är borttaget. När integrationen återinförs kan listan med
          senaste uppdateringar aktiveras igen.
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white/70 p-8 text-sm text-neutral-500">
        Ingen data laddas just nu.
      </div>
    </div>
  );
}
