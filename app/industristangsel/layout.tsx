import "../../apps/industristangsel/app/globals.css";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";


type IndustristangselLayoutProps = {
  children: ReactNode;
};

export const metadata: Metadata = {
  title: {
    default: "StÃ¤ngselplaneraren",
    template: "%s | IndustristÃ¤ngsel",
  },
  icons: {
    icon: [{ url: "/industristangsel/favicon-v2.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/industristangsel/apple-touch-icon-v2.png", sizes: "180x180" }],
  },
};

export default function IndustristangselLayout({ children }: IndustristangselLayoutProps) {
  return (
    <div className="industristangsel-app" suppressHydrationWarning>
      <Suspense fallback={null}>
      </Suspense>
      {children}
      
    </div>
  );
}
