import type { Metadata, Viewport } from "next";

// PPR: partial prerendering — static shell pre-rendered, dynamic content loads on-demand
export const experimental_ppr = true;

import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { getConfig } from "@/lib/config";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import "./globals.css";

/**
 * Single font system — Inter Variable untuk seluruh UI termasuk angka
 * (tabular-nums diaktifkan via CSS feature-settings). Konsisten & profesional
 * (mengikuti pendekatan platform fintech modern).
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

// Theme/PWA colors must live in the viewport export in Next 15 (not metadata).
// Matches the brand dark surface used across the app (see app/globals.css /
// opengraph-image.tsx).
export const viewport: Viewport = {
  themeColor: "#0c1117",
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [name, tagline] = await Promise.all([
      getConfig<string>("app.name", { defaultValue: "Nubuat" }),
      getConfig<string>("app.tagline", { defaultValue: "Analisis saham Indonesia" }),
    ]);
    return {
      title: { default: name, template: `%s | ${name}` },
      description: tagline,
      icons: { icon: "/favicon.ico" },
      metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
      // Enables "Add to Home Screen" as a standalone iOS web app.
      appleWebApp: {
        capable: true,
        title: name,
        statusBarStyle: "black-translucent",
      },
      openGraph: {
        title: name,
        description: tagline,
        locale: "id_ID",
        type: "website",
      },
    };
  } catch {
    return { title: "Nubuat", description: "Analisis saham Indonesia" };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "border border-border bg-card text-foreground shadow-lg",
            },
          }}
        />
        <CookieConsentBanner />
        <VercelAnalytics />
      </body>
    </html>
  );
}
