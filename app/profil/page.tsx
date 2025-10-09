"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const supabase = createClient();
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || "");
      const { data } = await supabase.from("profiles").select("role").eq("id", user?.id).maybeSingle();
      setRole(data?.role || "");
    })();
  }, [supabase]);

  function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="space-y-4 max-w-xl">
      <h1 className="text-2xl font-semibold">Profil &amp; inställningar</h1>
      <div className="card p-4">
        <div className="text-sm text-neutral-500">E-post</div>
        <div className="font-medium">{email}</div>
      </div>
      <div className="card p-4">
        <div className="text-sm text-neutral-500">Roll</div>
        <div className="font-medium">{role}</div>
      </div>

      <div className="card p-4 space-y-2">
        <div>
          <div className="font-medium">Utseende</div>
          <p className="text-sm text-neutral-500">Välj mörkt läge (lagras lokalt).</p>
        </div>
        <button onClick={toggleTheme} className="h-10 px-4 rounded-2xl bg-neutral-100 hover:bg-neutral-200">
          Växla mörkt läge
        </button>
      </div>

      <div className="card p-4">
        <div className="font-medium mb-1">Notiser</div>
        <p className="text-sm text-neutral-500">Dummy-inställningar för notiser (kommer senare).</p>
      </div>
    </div>
  );
}
