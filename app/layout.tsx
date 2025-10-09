import "../styles/globals.css";
import { Inter } from "next/font/google";
import { ReactNode } from "react";
import { createServerClientSupabase } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { site } from "@/config/site";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: site.name,
  description: site.description,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <html lang="sv" suppressHydrationWarning>
      <body className={inter.className}>
        {user ? <Navbar role={profile?.role} /> : null}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-12 text-sm text-neutral-500">
          © {new Date().getFullYear()} Säljstöd NA
        </footer>
      </body>
    </html>
  );
}
