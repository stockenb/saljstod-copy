import "../../apps/villastangsel/app/globals.css";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

type VillastangselLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  title: {
    default: "StÃ¤ngselplaneraren",
    template: "%s | Nils Ahlgren",
  },
  icons: {
    icon: [{ url: "/villastangsel/favicon-v2.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/villastangsel/apple-touch-icon-v2.png", sizes: "180x180" }],
  },
};

export default function VillastangselLayout({ children }: VillastangselLayoutProps) {
  return (
    <div className="villastangsel-app" suppressHydrationWarning>
      <Suspense fallback={null}>
      </Suspense>
      {children}

    </div>
  );
}
