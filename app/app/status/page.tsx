import type { Metadata } from "next";
import { PublicNav } from "@/components/landing/PublicNav";
import { StatusView } from "./status-view";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Status Layanan — Nubuat",
  description:
    "Status real-time layanan Nubuat: aplikasi web, database, market data & AI worker, serta antrian. Pantau ketersediaan platform analisis saham IDX.",
  alternates: { canonical: `${APP_URL}/status` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Status Layanan — Nubuat",
    description: "Status real-time layanan Nubuat untuk platform analisis saham IDX.",
    url: `${APP_URL}/status`,
    type: "website",
  },
};

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <StatusView />
    </div>
  );
}
