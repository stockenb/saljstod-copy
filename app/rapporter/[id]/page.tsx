export default function EditReportPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Rapporter</span>
      <h1>Redigera rapport {params.id}</h1>
      <p className="text-sm text-neutral-500">
        Redigering är otillgänglig tills Supabase-integrationen aktiveras på nytt.
      </p>
    </div>
  );
}
