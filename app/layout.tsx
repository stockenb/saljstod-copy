import "../styles/globals.css";
import { ReactNode } from "react";

import { Navbar } from "@/components/navbar";
import { site } from "@/config/site";

export const metadata = {
  title: site.name,
  description: site.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <body>
        <Navbar />
        <main className="mx-auto w-full max-w-7xl px-6  sm:px-8 lg:px-10">{children}</main>
        <footer className="mx-auto w-full max-w-7xl px-6 pb-8 text-sm text-neutral-500 sm:px-8 lg:px-10">
          © {new Date().getFullYear()} Säljstöd Nils Ahlgren AB. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
