"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: "Din e-postadress är inte godkänd för åtkomst. Kontakta administratören.",
  auth_failed: "Inloggningen misslyckades. Försök igen eller kontakta administratören.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    errorCode ? (ERROR_MESSAGES[errorCode] ?? "Ett fel inträffade.") : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Ett fel inträffade.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Kunde inte skicka länken. Kontrollera din internetanslutning.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative -mx-6 -mt-10 flex min-h-screen flex-col items-center justify-center px-4 sm:-mx-8 lg:-mx-10"
      style={{ background: "linear-gradient(135deg, #0d0e18 0%, #111326 50%, #0e1020 100%)" }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)" }}
      />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-72 w-72 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <Image
            src="/na_foretag.png"
            alt="Nils Ahlgren"
            width={150}
            height={38}
            priority
            className="h-9 w-auto brightness-0 invert opacity-90"
          />
          <span className="rounded-full border border-white/[0.22]0 bg-white/[0.09] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Internt system
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.16] bg-white/[0.07] p-8 backdrop-blur-xl">
          {sent ? (
            <div className="flex flex-col items-center gap-5 py-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/15 text-emerald-300">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-100" style={{ letterSpacing: "-0.01em" }}>
                  Länk skickad!
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  Vi har skickat en inloggningslänk till{" "}
                  <span className="font-semibold text-gray-200">{email}</span>.
                  Klicka på länken i mejlet för att logga in.
                </p>
              </div>
              <p className="text-xs text-gray-600">Inget mejl? Kontrollera skräpposten.</p>
            </div>
          ) : (
            <>
              <div className="mb-7 text-center">
                <h1 className="text-xl font-black text-gray-100" style={{ letterSpacing: "-0.02em" }}>
                  Logga in
                </h1>
                <p className="mt-1.5 text-sm text-gray-400">
                  Ange din e-post så skickar vi en inloggningslänk.
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-xs leading-relaxed text-red-300">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
                    E-postadress
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="namn@nilsahlgren.se"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.18] bg-white/[0.09] py-3 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all focus:border-violet-500/50 focus:bg-white/[0.12] focus:ring-1 focus:ring-violet-500/30"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!email.trim() || loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:translate-y-0"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Skickar…</>
                  ) : (
                    <>Skicka inloggningslänk <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-gray-600">
                Endast godkända e-postadresser har tillgång.
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} Nils Ahlgren AB
        </p>
      </div>
    </div>
  );
}
