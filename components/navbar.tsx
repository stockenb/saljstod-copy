"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";

export function Navbar({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const nav = [
    { href: "/", label: "Hem" },
    ...(role === "SKRUV" || role === "ADMIN" ? [{ href: "/besoksrapporter", label: "Besöksrapporter" }] : []),
    ...(role === "SKRUV" || role === "ADMIN" ? [{ href: "/rapporter", label: "Rapporter" }] : []),
    { href: "/nyheter", label: "Nyheter" },
    { href: "/profil", label: "Profil" },
  ];

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
    <header className="sticky top-0 z-50 w-full shadow-card">
      <div className="border-b border-primary/20 bg-primary text-white backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex w-full items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="leading-tight">
                Säljstöd - Nils Ahlgren AB
                <span className="block text-xs font-normal uppercase tracking-[0.3em] text-white/60">Säljstöd - Nils Ahlgren AB</span>
              </span>
            </Link>
            <form action="/logout" method="post" className="flex items-center gap-2 lg:hidden">
              <Button type="submit" size="sm" variant="contrast">
                <LogOut className="mr-2 h-4 w-4" /> Logga ut
              </Button>
            </form>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
            <nav className="flex flex-1 flex-wrap items-center gap-2 lg:flex-none lg:gap-3">
              {nav.map((n) => {
                const isActive = pathname === n.href;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "group relative flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium text-white/80 transition duration-calm ease-calm hover:bg-white/10 hover:text-white",
                      isActive && "bg-white/15 text-white shadow-inset"
                    )}
                  >
                    <span>{n.label}</span>
                    {isActive && <span className="absolute -bottom-[0.15rem] left-4 right-4 h-1 rounded-pill bg-white/80" />}
                  </Link>
                );
              })}
              {mounted && role === "ADMIN" && (
                <Link
                  href="/admin/nyheter"
                  className={cn(
                    "group relative flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium text-white/80 transition duration-calm ease-calm hover:bg-white/10 hover:text-white",
                    pathname.startsWith("/admin") && "bg-white/15 text-white shadow-inset"
                  )}
                >
                  Admin
                  {pathname.startsWith("/admin") && (
                    <span className="absolute -bottom-[0.15rem] left-4 right-4 h-1 rounded-pill bg-white/80" />
                  )}
                </Link>
              )}
            </nav>
            <form action="/logout" method="post" className="hidden lg:block">
              <Button type="submit" variant="contrast">
                <LogOut className="mr-2 h-4 w-4" /> Logga ut
              </Button>
            </form>
          </div>
        </div>
      </div>
      {breadcrumbItems.length ? (
        <div className="border-b border-primary/20 bg-primary-600/10 py-2">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 text-xs font-medium text-white/80 sm:px-8 lg:px-10">
            <Link href="/" className="text-white/80 hover:text-white">
              Hem
            </Link>
            {breadcrumbItems.map((item, index) => (
              <span key={item.href} className="flex items-center gap-2">
                <span aria-hidden className="text-white/40">
                  /
                </span>
                {index === breadcrumbItems.length - 1 ? (
                  <span className="text-white">{item.label}</span>
                ) : (
                  <Link href={item.href} className="text-white/80 hover:text-white">
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
