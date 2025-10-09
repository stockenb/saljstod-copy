"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function Navbar({ role }: { role?: string | null }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const nav = [
    { href: "/", label: "Dashboard" },
    ...(role === "SKRUV" || role === "ADMIN" ? [{ href: "/besoksrapporter", label: "Besöksrapporter" }] : []),
    ...(role === "SKRUV" || role === "ADMIN" ? [{ href: "/rapporter", label: "Rapporter" }] : []),
    { href: "/nyheter", label: "Nyheter" },
    { href: "/profil", label: "Profil" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-hairline backdrop-blur bg-white/70 dark:bg-neutral-950/70">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-semibold tracking-tight">
            <span className="text-primary">Säljstöd</span> NA
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm hover:bg-neutral-100",
                  pathname === n.href && "bg-neutral-100 text-neutral-900"
                )}
              >
                {n.label}
              </Link>
            ))}
            {mounted && role === "ADMIN" && (
              <Link
                href="/admin/nyheter"
                className={cn(
                  "px-3 py-2 rounded-xl text-sm hover:bg-neutral-100",
                  pathname.startsWith("/admin") && "bg-neutral-100 text-neutral-900"
                )}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <form action="/logout" method="post">
          <Button type="submit" variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Logga ut
          </Button>
        </form>
      </div>
    </header>
  );
}
