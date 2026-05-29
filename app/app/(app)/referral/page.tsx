import { headers } from "next/headers";
import { ReferralView } from "@/components/referral/referral-view";
import { requireSession } from "@/lib/auth/server";
import { getReferralStats } from "@/lib/referral";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ajak Teman — Referral | Nubuat",
  description: "Bagikan link referral Nubuat dan dapatkan reward kredit tiap teman yang qualified.",
};

/** Bangun base URL (https://host) dari request headers. */
async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function ReferralPage() {
  const session = await requireSession();
  const baseUrl = await getBaseUrl();
  const stats = await getReferralStats(session.user.id, baseUrl);
  return <ReferralView stats={stats} />;
}
