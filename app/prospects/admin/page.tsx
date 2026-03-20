"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Status = "none" | "red" | "yellow" | "green";

type Prospect = {
  id: string;
  company_name: string;
  city: string;
  contact_person: string;
  comment: string;
  status: Status;
  user_id: string;
};

type UserGroup = {
  user_id: string;
  email: string;
  prospects: Prospect[];
};

const STATUS_COLORS: Record<Status, { row: string; dot: string; label: string }> = {
  none:   { row: "",                   dot: "bg-white/20",    label: "Ingen" },
  red:    { row: "bg-red-500/25",      dot: "bg-red-400",     label: "Röd" },
  yellow: { row: "bg-amber-500/20",    dot: "bg-amber-400",   label: "Gul" },
  green:  { row: "bg-emerald-500/20",  dot: "bg-emerald-400", label: "Grön" },
};

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn("rounded-xl border px-4 py-3", color)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-current opacity-60">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

export default function ProspectsAdminPage() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) { router.replace("/prospects"); return; }
    fetchAll();
  }, [isAdmin, authLoading]);

  async function fetchAll() {
    setLoading(true);

    // Hämta alla prospects (admins har SELECT-policy för alla)
    const { data: allProspects } = await supabase
      .from("prospects")
      .select("id, company_name, city, contact_person, comment, status, user_id")
      .order("created_at", { ascending: true });

    if (!allProspects) { setLoading(false); return; }

    // Hämta användarinfo från profiles
    const userIds = [...new Set(allProspects.map((p) => p.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", userIds);

    const profileMap = new Map((profilesData || []).map((p) => [p.id, p.email || p.name || p.id]));

    const grouped = userIds.map((uid) => ({
      user_id: uid,
      email: profileMap.get(uid) || uid,
      prospects: allProspects.filter((p) => p.user_id === uid) as Prospect[],
    }));

    setGroups(grouped);
    setLoading(false);
  }

  const allProspects = groups.flatMap((g) => g.prospects);
  const total = allProspects.length;
  const countRed = allProspects.filter((p) => p.status === "red").length;
  const countYellow = allProspects.filter((p) => p.status === "yellow").length;
  const countGreen = allProspects.filter((p) => p.status === "green").length;
  const countNone = allProspects.filter((p) => p.status === "none").length;

  if (authLoading || loading) {
    return <div className="py-20 text-center text-sm text-gray-600">Laddar…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <Link href="/prospects" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-gray-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Tillbaka
        </Link>
        <p className="mb-2 text-[11px] font-semibold tracking-[0.25em] text-amber-400 uppercase">
          Admin
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-100" style={{ letterSpacing: "-0.02em" }}>
          Prospects — Översikt
        </h1>
        <p className="mt-2 text-sm text-gray-400">Alla användares prospects. Skrivskyddad vy.</p>
      </div>

      {/* Statistik totalt */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatBadge label="Totalt" value={total} color="border-white/[0.30] bg-white/[0.12] text-gray-200" />
        <StatBadge label="Röda" value={countRed} color="border-red-500/20 bg-red-500/[0.07] text-red-300" />
        <StatBadge label="Gula" value={countYellow} color="border-amber-500/20 bg-amber-500/[0.07] text-amber-300" />
        <StatBadge label="Gröna" value={countGreen} color="border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-300" />
        <StatBadge label="Ingen status" value={countNone} color="border-white/[0.22] bg-white/[0.08] text-gray-400" />
      </div>

      {/* Per användare */}
      {groups.map((group) => {
        const gRed = group.prospects.filter((p) => p.status === "red").length;
        const gYellow = group.prospects.filter((p) => p.status === "yellow").length;
        const gGreen = group.prospects.filter((p) => p.status === "green").length;
        const gNone = group.prospects.filter((p) => p.status === "none").length;

        return (
          <div key={group.user_id} className="overflow-hidden rounded-2xl border border-white/[0.30]">
            {/* Användarrubrik */}
            <div className="flex items-center justify-between border-b border-white/[0.22] bg-white/[0.08] px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-200">{group.email}</p>
                <p className="mt-0.5 text-xs text-gray-500">{group.prospects.length} prospects</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {gRed > 0 && <span className="flex items-center gap-1 text-red-300"><Circle className="h-2 w-2 fill-red-400 text-red-400" />{gRed}</span>}
                {gYellow > 0 && <span className="flex items-center gap-1 text-amber-300"><Circle className="h-2 w-2 fill-amber-400 text-amber-400" />{gYellow}</span>}
                {gGreen > 0 && <span className="flex items-center gap-1 text-emerald-300"><Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />{gGreen}</span>}
                {gNone > 0 && <span className="text-gray-500">— {gNone}</span>}
              </div>
            </div>

            {/* Tabell */}
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-white/[0.32]">
                    {["Kund", "Ort", "Kontaktperson", "Kommentar", "Status"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {group.prospects.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-600">Inga prospects.</td></tr>
                  ) : (
                    group.prospects.map((p) => (
                      <tr key={p.id} className={cn("transition-colors", STATUS_COLORS[p.status].row)}>
                        <td className="px-4 py-2.5 text-sm text-gray-200">{p.company_name || <span className="text-gray-600">—</span>}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-300">{p.city || <span className="text-gray-600">—</span>}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-300">{p.contact_person || <span className="text-gray-600">—</span>}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-400">{p.comment || <span className="text-gray-600">—</span>}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium", {
                            "bg-red-500/10 text-red-300": p.status === "red",
                            "bg-amber-500/10 text-amber-300": p.status === "yellow",
                            "bg-emerald-500/10 text-emerald-300": p.status === "green",
                            "text-gray-600": p.status === "none",
                          })}>
                            {p.status !== "none" && <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_COLORS[p.status].dot)} />}
                            {STATUS_COLORS[p.status].label}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {groups.length === 0 && (
        <div className="rounded-2xl border border-white/[0.22] py-16 text-center text-sm text-gray-600">
          Inga prospects registrerade ännu.
        </div>
      )}
    </div>
  );
}
