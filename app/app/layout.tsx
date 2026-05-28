import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { getConfig } from "@/lib/config";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
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
      </body>
    </html>
  );
}
