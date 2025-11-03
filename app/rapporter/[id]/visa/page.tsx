export default function ViewReportPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-4">
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Rapporter</span>
      <h1>Rapport {params.id}</h1>
      <p className="text-sm text-neutral-500">
        Visningsläget är pausat eftersom rapportdata inte laddas utan Supabase.
      </p>
    </div>
  );
}
