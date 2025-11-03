export default function NewsDetail({ params }: { params: { slug: string } }) {
  return (
    <article className="space-y-6">
      <header className="space-y-4">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Nyhet</span>
        <h1>{params.slug.replace(/-/g, " ")}</h1>
        <p className="text-sm text-neutral-500">
          Denna sida visar ingen data just nu eftersom Supabase och autentisering är borttaget. När integrationen kommer tillbaka
          kan detaljerad nyhetsinformation åter laddas här.
        </p>
      </header>
    </article>
  );
}
