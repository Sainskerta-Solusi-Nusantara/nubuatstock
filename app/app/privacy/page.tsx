import type { Metadata } from "next";
import { getConfig } from "@/lib/config";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const revalidate = 300; // 5 menit ISR — superadmin edit → muncul cepat

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Kebijakan Privasi", robots: "index,follow" };
}

export default async function PrivacyPage() {
  const [appName, body, lastUpdated] = await Promise.all([
    getConfig<string>("app.name", { defaultValue: "Nubuat" }),
    getConfig<string>("legal.privacy.body_md", { defaultValue: "# Kebijakan Privasi\n\nKonten belum diisi. Hubungi admin." }),
    getConfig<string>("legal.privacy.last_updated", { defaultValue: new Date().toISOString().slice(0, 10) }),
  ]);
  return <LegalLayout title="Kebijakan Privasi" lastUpdated={lastUpdated} bodyMd={body} appName={appName} />;
}
