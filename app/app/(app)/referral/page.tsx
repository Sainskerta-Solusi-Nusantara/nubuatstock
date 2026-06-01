import { headers } from "next/headers";
import { and, asc, eq, gt } from "drizzle-orm";
import { ReferralView } from "@/components/referral/referral-view";
import { requireSession } from "@/lib/auth/server";
import { getReferralStats, getAvailableCredit } from "@/lib/referral";
import { db } from "@/lib/db";
import { subscriptionTiers } from "@/db/schema/billing";

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
  const [stats, coinBalance, tierRows] = await Promise.all([
    getReferralStats(session.user.id, baseUrl),
    getAvailableCredit(session.user.id),
    db
      .select({
        kode: subscriptionTiers.kode,
        nama: subscriptionTiers.nama,
        priceMonthlyIdr: subscriptionTiers.priceMonthlyIdr,
      })
      .from(subscriptionTiers)
      .where(and(eq(subscriptionTiers.isPublic, true), gt(subscriptionTiers.priceMonthlyIdr, 0)))
      .orderBy(asc(subscriptionTiers.sortOrder)),
  ]);
  return <ReferralView stats={stats} coinBalance={coinBalance} tiers={tierRows} />;
}
