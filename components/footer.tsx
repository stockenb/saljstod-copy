"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/use-auth";

const nav = [
  { href: "/", label: "Hem" },
  { href: "/nyheter", label: "Nyheter" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rapporter", label: "Rapporter" },
];

const tools = [
  { href: "/produktblad", label: "Produktblad" },
  { href: "/artikelbas", label: "Artikelbas" },
  { href: "/ean", label: "EAN-generator" },
];

const external = [
  { href: "https://karta.nilsahlgren.se", label: "Villastängsel" },
  { href: "https://industristangsel.vercel.app", label: "Industristängsel" },
];

export function Footer() {
  const { user, loading } = useAuth();

  if (loading || !user) return null;

  return (
    <footer style={{ background: "#07080f", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/na_foretag.png"
              alt="Nils Ahlgren"
              width={110}
              height={28}
              className="mb-4 h-6 w-auto brightness-0 invert opacity-60"
            />
            <p className="max-w-[160px] text-xs leading-relaxed text-gray-600">
              Internt säljstödsystem för Nils Ahlgren AB.
            </p>
            <div className="mt-5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-gray-600">System online</span>
            </div>
          </div>

          {/* Nav */}
          <div>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-600">
              Navigation
            </p>
            <ul className="space-y-2.5">
              {nav.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-gray-500 no-underline transition-colors hover:text-gray-200"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-600">
              Verktyg
            </p>
            <ul className="space-y-2.5">
              {tools.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-gray-500 no-underline transition-colors hover:text-gray-200"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              {external.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-500 no-underline transition-colors hover:text-gray-200"
                  >
                    {l.label}
                    <span className="text-gray-700">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-600">
              Konto
            </p>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/profil"
                  className="text-xs text-gray-500 no-underline transition-colors hover:text-gray-200"
                >
                  Min profil
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 flex flex-col gap-1 border-t pt-6 text-[11px] text-gray-700 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "rgba(255,255,255,0.04)" }}
        >
          <span>© {new Date().getFullYear()} Nils Ahlgren AB</span>
          <span>Internt system · Ej för extern distribution</span>
        </div>
      </div>
    </footer>
  );
}
