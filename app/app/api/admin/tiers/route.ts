import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { subscriptionTiers, tierEntitlements } from "@/db/schema/billing";
import { handleError, ok } from "@/lib/utils/api";

export async function GET() {
  try {
    await requireAdmin();
    const [tiers, entitlements] = await Promise.all([
      db.select().from(subscriptionTiers).orderBy(asc(subscriptionTiers.sortOrder)),
      db.select().from(tierEntitlements).orderBy(asc(tierEntitlements.entitlementKey)),
    ]);
    return ok({ tiers, entitlements });
  } catch (err) {
    return handleError(err);
  }
}
