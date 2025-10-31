import "../styles/globals.css";
import { Work_Sans } from "next/font/google";
import { ReactNode } from "react";
import { getSupabaseServer } from "@/lib/supabase/serverClient";
import { Navbar } from "@/components/navbar";
import { site } from "@/config/site";

const workSans = Work_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-work-sans"
});

export const metadata = {
  title: site.name,
  description: site.description,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <html lang="sv" suppressHydrationWarning>
      <body className={workSans.className}>
        {user ? <Navbar role={profile?.role} /> : null}
        <main className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-8 lg:px-10">{children}</main>
        <footer className="mx-auto w-full max-w-7xl px-6 pb-12 pt-16 text-sm text-neutral-500 sm:px-8 lg:px-10">
          © {new Date().getFullYear()} Säljstöd NA. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
