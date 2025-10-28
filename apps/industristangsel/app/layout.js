// app/layout.js
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import Gtm from "../components/Gtm";
import ClientTracking from "../components/ClientTracking";
import { Suspense } from "react";

export const metadata = {
  title: { default: "Stängselplaneraren", template: "%s | Industristängsel" },
  icons: {
    icon: [{ url: "/favicon-v2.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-touch-icon-v2.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body style={{ margin: 0 }}>
        <Gtm />
        {/* 🔧 Viktigt: wrappa klientkomponenten som använder useSearchParams i Suspense */}
        <Suspense fallback={null}>
          <ClientTracking />
        </Suspense>

        {children}
        <Analytics />
      </body>
    </html>
  );
}
