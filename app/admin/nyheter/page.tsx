export default function AdminNewsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Admin</span>
        <h1>Nyhetsadministration pausad</h1>
        <p className="max-w-2xl text-sm text-neutral-500">
          Denna vy kräver Supabase och autentisering som för närvarande är borttaget. När integrationen återinförs kan
          administrationsformuläret aktiveras igen.
        </p>
      </header>
    </div>
  );
}
