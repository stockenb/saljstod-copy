"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();

  const nav = useMemo(
    () => [
      { href: "/", label: "Hem" },
     // { href: "/besoksrapporter", label: "Kunder" },
     // { href: "/rapporter", label: "Rapporter" },
     // { href: "/nyheter", label: "Nyheter" },
     // { href: "/profil", label: "Profil" },
    ],
    []
  );

  const segments = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
  const breadcrumbItems = useMemo(() => {
    if (segments.length < 2) return [];
    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      const label = segment
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      return { href, label };
    });
  }, [segments]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4 text-sm text-neutral-600 sm:px-8 lg:flex-nowrap lg:px-10">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/na_foretag.png"
            alt="Nils Ahlgren"
            width={140}
            height={32}
            priority
            className="h-10 w-auto"
          />
          <span className="sr-only">Säljstöd</span>
        </Link>
      {/* <nav className="flex flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap rounded-full bg-white/70 px-3 py-1.5 text-sm text-neutral-600 shadow-sm ring-1 ring-black/5">
          {nav.map((n) => {
            const isActive = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 transition duration-200 ease-out",
                  isActive
                    ? "bg-neutral-900 text-white shadow"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>*/}
        <div className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-400">
          2025
        </div>
      </div>
      {breadcrumbItems.length ? (
        <div className="border-t border-white/70 bg-white/60 py-2">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 text-xs font-medium text-neutral-500 sm:px-8 lg:px-10">
            <Link href="/" className="text-neutral-500 hover:text-neutral-800">
              Hem
            </Link>
            {breadcrumbItems.map((item, index) => (
              <span key={item.href} className="flex items-center gap-2">
                <span aria-hidden className="text-neutral-300">/</span>
                {index === breadcrumbItems.length - 1 ? (
                  <span className="text-neutral-800">{item.label}</span>
                ) : (
                  <Link href={item.href} className="text-neutral-500 hover:text-neutral-800">
                    {item.label}
                  </Link>
                )}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
