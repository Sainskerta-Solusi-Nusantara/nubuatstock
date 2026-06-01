/**
 * Redemption Coin referral → langganan Nubuat.
 *
 * Coin (kredit referral) TIDAK bisa di-withdraw jadi uang tunai — hanya bisa
 * ditukar penuh untuk membayar satu periode langganan. Coin bersifat fungible
 * (1 Coin = Rp 1) sehingga bisa menutup harga tier persis.
 */
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { subscriptionTiers } from "@/db/schema/billing";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { activateSubscriptionFromCredit } from "@/lib/billing/subscriptions";
import type { BillingCycle, TierKode } from "@/lib/types/billing";
import { getAvailableCredit, redeemCreditForAmount } from "./service";

export interface RedeemForSubResult {
  tierKode: string;
  tierName: string;
  billingCycle: BillingCycle;
  priceIdr: number;
  coinUsed: number;
  remainingCoin: number;
}

export async function redeemCoinForSubscription(
  userId: string,
  tierKode: TierKode,
  billingCycle: BillingCycle,
): Promise<RedeemForSubResult> {
  const rows = await db
    .select()
    .from(subscriptionTiers)
    .where(eq(subscriptionTiers.kode, tierKode))
    .limit(1);
  const tier = rows[0];
  if (!tier) throw new NotFoundError(`Tier ${tierKode}`);
  if (!tier.isPublic) throw new ValidationError("Tier ini tidak tersedia untuk ditukar.");

  const price = billingCycle === "annual" ? tier.priceAnnualIdr : tier.priceMonthlyIdr;
  if (!price || price <= 0) {
    throw new ValidationError("Tier ini tidak bisa ditukar dengan Coin.");
  }

  const balance = await getAvailableCredit(userId);
  if (balance < price) {
    throw new ValidationError(
      `Coin belum cukup. Butuh ${price.toLocaleString("id-ID")} Coin, kamu punya ${balance.toLocaleString("id-ID")}.`,
    );
  }

  const redeemed = await redeemCreditForAmount(userId, price);
  if (redeemed.redeemedIdr < price) {
    // Seharusnya tak terjadi (saldo sudah dicek cukup). Gagal aman.
    logger.error({ userId, price, redeemed }, "Coin redeem shortfall — saldo cukup tapi redeem kurang");
    throw new ValidationError("Gagal memakai Coin. Coba lagi sebentar.");
  }

  await activateSubscriptionFromCredit({
    userId,
    tierKode,
    billingCycle,
    reason: `Tukar ${price.toLocaleString("id-ID")} Coin referral untuk ${tier.nama}`,
    metadata: { source: "referral_coin", coinUsed: redeemed.redeemedIdr, rewardIds: redeemed.rewardIds },
  });

  const remainingCoin = await getAvailableCredit(userId);
  logger.info({ userId, tierKode, billingCycle, price }, "Coin redeemed for subscription");

  return {
    tierKode,
    tierName: tier.nama,
    billingCycle,
    priceIdr: price,
    coinUsed: redeemed.redeemedIdr,
    remainingCoin,
  };
}
