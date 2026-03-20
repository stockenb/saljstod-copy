"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  X,
  ChevronDown,
  User,
  Home,
  Newspaper,
  BarChart2,
  FileText,
  Database,
  Tag,
  Files,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/use-auth";

const toolsLinks = [
  { href: "/produktblad", label: "Skapa produktblad", icon: FileText },
  { href: "/produktblad/samlat", label: "Samlat produktblad", icon: Files },
  { href: "/artikelbas", label: "Artikelbas", icon: Database },
  { href: "/ean", label: "EAN-generator", icon: Tag },
];

const navLinks = [
  { href: "/", label: "Hem", icon: Home },
  { href: "/nyheter", label: "Nyheter", icon: Newspaper },
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
  { href: "/prospects", label: "Nykunder", icon: UserPlus },
];

const toolsRoots = ["/produktblad", "/artikelbas", "/ean"];

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { name: userName, isAdmin: admin, user, loading } = useAuth();

  useEffect(() => {
    setIsMenuOpen(false);
    setIsToolsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading || !user) return null;

  const isToolsActive = toolsRoots.some((r) => pathname.startsWith(r));

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-white/[0.06] bg-[#0d0e18]/95 shadow-2xl shadow-black/30 backdrop-blur-xl"
          : "border-b border-white/[0.04] bg-[#0d0e18]"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 sm:px-8 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center py-3.5">
          <Image
            src="/na_foretag.png"
            alt="Nils Ahlgren"
            width={130}
            height={30}
            priority
            className="h-9 w-auto brightness-0 invert opacity-90"
          />
          <span className="sr-only">Säljstöd</span>
        </Link>

        {/* Divider */}
        <div className="mx-3 hidden h-4 w-px bg-white/10 lg:block" />

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center gap-0.5 lg:flex">
          {navLinks.map((n) => {
            const isActive =
              n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "relative px-3.5 py-3.5 text-[13px] font-medium transition-colors duration-150",
                  isActive
                    ? "text-violet-300"
                    : "text-gray-400 hover:text-gray-200"
                )}
              >
                {isActive && (
                  <span className="absolute bottom-0 left-3.5 right-3.5 h-px rounded-full bg-violet-400" />
                )}
                {n.label}
              </Link>
            );
          })}

          {/* Verktyg dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsToolsOpen((o) => !o)}
              className={cn(
                "relative flex items-center gap-1 px-3.5 py-3.5 text-[13px] font-medium transition-colors duration-150",
                isToolsActive
                  ? "text-violet-300"
                  : "text-gray-400 hover:text-gray-200"
              )}
            >
              Verktyg
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  isToolsOpen && "rotate-180"
                )}
              />
              {isToolsActive && (
                <span className="absolute bottom-0 left-3.5 right-3.5 h-px rounded-full bg-violet-400" />
              )}
            </button>

            {isToolsOpen && (
              <>
                <div className="fixed inset-0" onClick={() => setIsToolsOpen(false)} />
                <div
                  className="absolute left-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-white/[0.30] shadow-2xl shadow-black/40 backdrop-blur-xl"
                  style={{ background: "#13142a" }}
                >
                  {toolsLinks.map((t, i) => {
                    const TIcon = t.icon;
                    const active = pathname.startsWith(t.href);
                    return (
                      <Link
                        key={t.href}
                        href={t.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 text-[13px] transition-colors no-underline",
                          i !== toolsLinks.length - 1 && "border-b border-white/[0.30]",
                          active
                            ? "bg-violet-500/10 text-violet-300"
                            : "text-gray-300 hover:bg-white/[0.16] hover:text-gray-100"
                        )}
                      >
                        <TIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                        {t.label}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Right: avatar + hamburger */}
        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <Link
            href="/profil"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] no-underline transition-colors hover:bg-white/[0.16]"
          >
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold text-white",
                admin
                  ? "bg-gradient-to-br from-amber-500 to-orange-600"
                  : "bg-gradient-to-br from-violet-600 to-indigo-600"
              )}
            >
              {initials || <User className="h-3.5 w-3.5" />}
            </div>
            <span className="hidden font-medium text-gray-300 sm:block">
              {userName}
            </span>
          </Link>

          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex items-center justify-center rounded-lg p-2 text-gray-400 transition hover:bg-white/[0.16] hover:text-gray-200 lg:hidden"
            aria-controls="site-navigation"
            aria-expanded={isMenuOpen}
          >
            <span className="sr-only">Visa meny</span>
            {isMenuOpen ? (
              <X className="h-4.5 w-4.5" aria-hidden />
            ) : (
              <Menu className="h-4.5 w-4.5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div
          id="site-navigation"
          className="border-t border-white/[0.05] px-6 pb-5 pt-4 sm:px-8 lg:hidden"
          style={{ background: "#0d0e18" }}
        >
          <nav className="flex flex-col gap-0.5">
            {navLinks.map((n) => {
              const isActive =
                n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors",
                    isActive
                      ? "bg-violet-500/10 text-violet-300"
                      : "text-gray-400 hover:bg-white/[0.16] hover:text-gray-200"
                  )}
                >
                  <n.icon className="h-4 w-4 shrink-0" />
                  {n.label}
                </Link>
              );
            })}

            <div className="mt-3 space-y-0.5 border-t border-white/[0.30] pt-3">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                Verktyg
              </p>
              {toolsLinks.map((t) => {
                const TIcon = t.icon;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors",
                      pathname.startsWith(t.href)
                        ? "bg-violet-500/10 text-violet-300"
                        : "text-gray-400 hover:bg-white/[0.16] hover:text-gray-200"
                    )}
                  >
                    <TIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
