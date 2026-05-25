/**
 * One-off: backfill user ke Trial Pro 7 hari.
 *
 * Usage:
 *   tsx scripts/backfill-trial.ts <email>
 *   tsx scripts/backfill-trial.ts alif@example.com
 */
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../db/schema/auth";
import { startTrialSubscription } from "../lib/billing/subscriptions";

async function main() {
  const email = process.argv[2]?.toLowerCase().trim();
  if (!email) {
    console.error("Usage: tsx scripts/backfill-trial.ts <email>");
    process.exit(1);
  }

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (found.length === 0) {
    console.error(`User dengan email ${email} tidak ditemukan.`);
    process.exit(2);
  }
  const user = found[0]!;
  console.log(`Found user: id=${user.id} name=${user.name}`);

  const sub = await startTrialSubscription({
    userId: user.id,
    metadata: { source: "manual_backfill", backfilledAt: new Date().toISOString() },
  });

  console.log("Trial subscription:", {
    id: sub.id,
    tierKode: sub.tierKode,
    status: sub.status,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
  });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(99);
});
