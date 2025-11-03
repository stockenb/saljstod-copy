"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browserClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const supabase = supabaseBrowser;
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error" | "processing">("idle");
  const [message, setMessage] = useState<string | null>(null);

  // Läs ev. redirect-param som vi vill bära med i mail-länken
  const nextParam = useMemo(() => {
    const r =
      searchParams.get("redirect") ||
      searchParams.get("next") ||
      searchParams.get("redirect_to") ||
      "/";
    return r.startsWith("/") ? r : "/";
  }, [searchParams]);

  // Fånga gamla hash-baserade länkar (signerar inte in längre)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.hash.includes("access_token=")) return;

    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, "", cleanUrl);

    setStatus("error");
    setMessage("Din länk är för gammal. Begär en ny magisk länk.");
  }, []);

  // Visa ev. fel från callbacken (?error=...)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (!errorParam) return;

    setStatus("error");
    if (errorParam === "unauthorized") {
      setMessage("Din e-postadress är inte behörig att logga in. Kontakta administratören.");
      return;
    }
    if (errorParam === "invalid_link") {
      setMessage("Din inloggningslänk är ogiltig eller har gått ut. Be om en ny.");
      return;
    }
    setMessage("Något gick fel. Försök igen.");
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("processing");
    setMessage("Skickar länk…");
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL;

      // Vi pekar magic-linken till vår server-side callback och skickar med next-param
      const redirectUrl =
        nextParam && nextParam !== "/"
          ? `${origin}/auth/callback?next=${encodeURIComponent(nextParam)}`
          : `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          // shouldCreateUser: false, // avkommentera om endast redan skapade användare ska kunna logga in
        },
      });

      if (error) throw error;

      setStatus("sent");
      setMessage("Länk skickad! Kolla din e-post och följ instruktionerna.");
    } catch (err: any) {
      console.error("signInWithOtp error:", err);
      setStatus("error");
      setMessage(err?.message ?? "Något gick fel. Försök igen.");
    }
  }

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm card p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Logga in</h1>
          <p className="text-sm text-neutral-500">
            Använd din företagsmail så skickar vi en magisk länk.
          </p>
        </div>

        <label className="space-y-2 block">
          <span className="text-sm font-medium">E-postadress</span>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="namn@foretag.se"
            aria-label="E-postadress"
            autoComplete="email"
            inputMode="email"
          />
        </label>

        <Button
          type="submit"
          disabled={!email || status === "sent" || status === "processing"}
          className="w-full"
        >
          Skicka magisk länk
        </Button>

        {message && (
          <p className={"text-sm " + (status === "error" ? "text-red-600" : "text-green-600")}>
            {message}
          </p>
        )}

        <p className="text-xs text-neutral-500">
          Har din länk gått ut? Be om en ny eller prova igen.
        </p>
      </form>
    </div>
  );
}
