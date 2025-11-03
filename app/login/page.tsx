"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) return;

    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    setStatus("processing");
    setMessage("Loggar in...");

    (async () => {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setStatus("error");
        setMessage(sessionError.message ?? "Något gick fel. Försök igen.");
        return;
      }

      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError || !user) {
        setStatus("error");
        setMessage("Något gick fel. Försök igen.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle<{ id: string }>();

      if (!profile || profileError) {
        await supabase.auth.signOut();
        setStatus("error");
        setMessage("Din e-postadress är inte behörig att logga in. Kontakta administratören.");
        return;
      }

      const redirectParam = params.get("redirect_to") ?? params.get("next") ?? "/";
      const redirectPath = redirectParam.startsWith("/") ? redirectParam : "/";

      window.location.replace(redirectPath);
    })().catch((error) => {
      console.error("Failed to handle magic link callback", error);
      setStatus("error");
      setMessage("Något gick fel. Försök igen.");
    });
  }, [supabase]);

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
    setStatus("idle");
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });
      if (error) throw error;
      setStatus("sent");
      setMessage("Länk skickad! Kolla din e-post.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Något gick fel.");
    }
  }

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm card p-6 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Logga in</h1>
          <p className="text-sm text-neutral-500">Använd din företagsmail så skickar vi en magisk länk.</p>
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
