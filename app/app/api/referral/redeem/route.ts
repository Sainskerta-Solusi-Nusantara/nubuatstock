import { NextRequest } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/server";
import { handleError, ok } from "@/lib/utils/api";
import { redeemCoinForSubscription } from "@/lib/referral";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  tierKode: z.string().min(1).max(40),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
});

/**
 * POST /api/referral/redeem — tukar Coin referral untuk langganan.
 * Body: { tierKode, billingCycle }.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = bodySchema.parse(await req.json());
    const result = await redeemCoinForSubscription(
      session.userId,
      parsed.tierKode as Parameters<typeof redeemCoinForSubscription>[1],
      parsed.billingCycle,
    );
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
