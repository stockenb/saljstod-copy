import "../styles/globals.css";
import { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { site } from "@/config/site";

export const metadata = {
  title: site.name,
  description: site.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col" style={{ background: "#11121f" }}>
        <Navbar />
        <main className="w-full flex-1 px-6 py-10 sm:px-8 lg:px-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
