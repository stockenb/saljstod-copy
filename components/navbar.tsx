"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const nav = useMemo(
    () => [
      { href: "/", label: "Hem" },
      { href: "/artikelbas", label: "Artikelbas" },
      { href: "/produktblad", label: "Produktblad" },
      { href: "/produktblad/samlat", label: "Samlade produktblad" },
    ],
    []
  );

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/20 backdrop-blur-xl">
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
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="flex items-center justify-center rounded-full bg-white/70 p-2 text-neutral-600 shadow-sm ring-1 ring-black/5 transition hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 lg:hidden"
          aria-controls="site-navigation"
          aria-expanded={isMenuOpen}
        >
          <span className="sr-only">Visa meny</span>
          {isMenuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
        <nav
          id="site-navigation"
          className={cn(
            "hidden w-full flex-col gap-1 rounded-2xl bg-white/90 p-3 text-sm text-neutral-600 shadow-lg ring-1 ring-black/5 lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:items-center lg:gap-1 lg:overflow-x-auto lg:whitespace-nowrap lg:rounded-full lg:bg-white/70 lg:px-3 lg:py-1.5",
            isMenuOpen && "flex"
          )}
        >
          {nav.map((n) => {
            const isActive = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex w-full items-center gap-2 rounded-full px-3 py-2 transition duration-200 ease-out lg:w-auto lg:justify-center",
                  isActive
                    ? "bg-primary-800 text-white shadow hover:text-neutral-300"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-400">
          Säljstöd - {new Date().getFullYear()}
        </div>
      </div>
      {/*{breadcrumbItems.length ? (
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
      ) : null}*/}
    </header>
  );
}
