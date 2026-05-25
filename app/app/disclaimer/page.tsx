import type { Metadata } from "next";
import { getConfig } from "@/lib/config";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Disclaimer", robots: "index,follow" };
}

export default async function DisclaimerPage() {
  const [appName, body, lastUpdated] = await Promise.all([
    getConfig<string>("app.name", { defaultValue: "Nubuat" }),
    getConfig<string>("legal.disclaimer.body_md", { defaultValue: "# Disclaimer\n\nKonten belum diisi." }),
    getConfig<string>("legal.disclaimer.last_updated", { defaultValue: new Date().toISOString().slice(0, 10) }),
  ]);
  return <LegalLayout title="Disclaimer Pasar Modal" lastUpdated={lastUpdated} bodyMd={body} appName={appName} />;
}
