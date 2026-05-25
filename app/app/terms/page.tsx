import type { Metadata } from "next";
import { getConfig } from "@/lib/config";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Syarat & Ketentuan", robots: "index,follow" };
}

export default async function TermsPage() {
  const [appName, body, lastUpdated] = await Promise.all([
    getConfig<string>("app.name", { defaultValue: "Nubuat" }),
    getConfig<string>("legal.terms.body_md", { defaultValue: "# Syarat & Ketentuan\n\nKonten belum diisi." }),
    getConfig<string>("legal.terms.last_updated", { defaultValue: new Date().toISOString().slice(0, 10) }),
  ]);
  return <LegalLayout title="Syarat & Ketentuan Layanan" lastUpdated={lastUpdated} bodyMd={body} appName={appName} />;
}
