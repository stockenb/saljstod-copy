"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut, Search } from "lucide-react";
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
  const activeNav = nav.find((item) => item.href === pathname);
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
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 pb-4 pt-5 sm:px-8 lg:px-10 lg:flex-row lg:items-center">
          <div className="flex items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-base font-bold text-white">
                NA
              </span>
              <span className="leading-tight">
                Säljstöd
                <span className="block text-xs font-normal uppercase tracking-[0.3em] text-white/60">Intranät</span>
              </span>
            </Link>
            <form action="/logout" method="post" className="flex items-center gap-2 lg:hidden">
              <Button type="submit" size="sm" variant="contrast">
                <LogOut className="mr-2 h-4 w-4" /> Logga ut
              </Button>
            </form>
          </div>
          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Aktuell vy</span>
              <div className="text-xl font-semibold">{activeNav?.label ?? "Översikt"}</div>
            </div>
            <nav className="flex flex-wrap items-center gap-2 lg:ml-auto">
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
            <div className="relative hidden w-full max-w-sm lg:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
              <input
                type="search"
                placeholder="Sök i intranätet"
                className="h-11 w-full rounded-pill border border-white/20 bg-white/15 pl-11 pr-4 text-sm text-white placeholder:text-white/60 shadow-sm outline-none transition duration-calm ease-calm focus:border-white focus:bg-white/20"
              />
            </div>
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
