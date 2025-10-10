"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">Profil</span>
        <h1>Profil &amp; inställningar</h1>
        <p className="text-sm text-neutral-500">
          Hantera dina personliga uppgifter och inställningar för intranätet.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Dina uppgifter</CardTitle>
          <CardDescription>Informationen hämtas automatiskt från ditt konto.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">E-post</div>
            <div className="rounded-2xl border border-surface-border/80 bg-white/90 px-4 py-3 text-sm font-medium text-neutral-800 dark:border-surface-dark-border/60 dark:bg-neutral-900/80 dark:text-neutral-100">
              {email}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Roll</div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{role || "-"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Utseende</CardTitle>
          <CardDescription>Välj mörkt eller ljust läge. Ditt val sparas i webbläsaren.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-500">
            Nuvarande läge:
            <span className="ml-2 font-medium text-neutral-800 dark:text-neutral-200">
              {typeof window !== "undefined" && document.documentElement.classList.contains("dark") ? "Mörkt" : "Ljust"}
            </span>
          </div>
          <Button onClick={toggleTheme} variant="secondary">
            Växla mörkt läge
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notiser</CardTitle>
          <CardDescription>Inställningarna aktiveras i kommande versioner.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">Du får mejl när viktiga uppdateringar publiceras.</p>
        </CardContent>
      </Card>
    </div>
  );
}
