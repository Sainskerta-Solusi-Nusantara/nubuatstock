/**
 * Referral program v1 — service layer.
 *
 * Public surface untuk domain referral. Import dari `@/lib/referral`,
 * JANGAN langsung dari sub-file ini.
 *
 * REWARD POLICY (v1):
 * - Referrer-only. Saat referral di-mark `qualified` (lihat markQualified),
 *   referrer dapat satu credit Rp 25.000 (REWARD_AMOUNT_IDR), dicatat di
 *   `referral_rewards` dengan status `granted`. Redemption (potong harga /
 *   tambah saldo billing) menyusul dan TIDAK ditangani di sini.
 * - Idempotent: satu reward per referral (unique referral_id).
 */

import { and, count, eq, ne } from "drizzle-orm";
import { ulid } from "ulid";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import {
  referralCodes,
  referralRewards,
  referrals,
} from "@/db/schema/referral";

/** Reward credit untuk referrer saat referral qualified. Integer rupiah. */
export const REWARD_AMOUNT_IDR = 25_000;

/** Panjang slug code (Crockford-ish base32, tanpa karakter ambigu). */
const CODE_LENGTH = 7;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export interface ReferralStats {
  code: string;
  link: string;
  totalReferred: number;
  qualified: number;
  rewardIdr: number;
}

function randomCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Bangun shareable link dari code + base URL.
 * Base URL ditentukan caller (dari request headers) supaya bebas env public.
 */
export function buildReferralLink(code: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/signup?ref=${encodeURIComponent(code)}`;
}

/**
 * getOrCreateCode — return code milik user; buat lazily kalau belum ada.
 * Retry pada collision unique code (sangat jarang).
 */
export async function getOrCreateCode(userId: string): Promise<string> {
  const existing = await db
    .select({ code: referralCodes.code })
    .from(referralCodes)
    .where(eq(referralCodes.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0].code;

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    try {
      const inserted = await db
        .insert(referralCodes)
        .values({ id: ulid(), userId, code })
        .onConflictDoNothing({ target: referralCodes.userId })
        .returning({ code: referralCodes.code });
      if (inserted[0]) return inserted[0].code;
      // Conflict on user_id → row sudah dibuat (race). Re-read.
      const again = await db
        .select({ code: referralCodes.code })
        .from(referralCodes)
        .where(eq(referralCodes.userId, userId))
        .limit(1);
      if (again[0]) return again[0].code;
    } catch (err) {
      // Kemungkinan collision pada code_uq → coba code lain.
      logger.debug({ err, attempt }, "referral code insert retry");
    }
  }
  throw new Error("Gagal membuat referral code setelah beberapa percobaan");
}

/** resolveCode — return referrerUserId untuk sebuah code, atau null. */
export async function resolveCode(code: string): Promise<string | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const rows = await db
    .select({ userId: referralCodes.userId })
    .from(referralCodes)
    .where(eq(referralCodes.code, normalized))
    .limit(1);
  return rows[0]?.userId ?? null;
}

/**
 * attributeSignup — catat bahwa `referredUserId` datang via `code`.
 *
 * Idempotent & aman:
 * - Code tidak valid → no-op (return null).
 * - Self-referral → no-op (return null).
 * - User sudah pernah di-attribute → keep yang lama (return existing).
 *
 * Return record referral (baru / existing) atau null kalau tidak di-attribute.
 */
export async function attributeSignup(
  referredUserId: string,
  code: string,
): Promise<{ id: string; referrerUserId: string } | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const referrerUserId = await resolveCode(normalized);
  if (!referrerUserId) return null;
  if (referrerUserId === referredUserId) return null; // can't self-refer

  // Sudah di-attribute? Pertahankan referrer pertama (one referrer per referred).
  const existing = await db
    .select({ id: referrals.id, referrerUserId: referrals.referrerUserId })
    .from(referrals)
    .where(eq(referrals.referredUserId, referredUserId))
    .limit(1);
  if (existing[0]) return existing[0];

  const inserted = await db
    .insert(referrals)
    .values({
      id: ulid(),
      referrerUserId,
      referredUserId,
      code: normalized,
      status: "pending",
    })
    .onConflictDoNothing({ target: referrals.referredUserId })
    .returning({ id: referrals.id, referrerUserId: referrals.referrerUserId });
  if (inserted[0]) return inserted[0];

  // Race: row dibuat bersamaan → re-read.
  const again = await db
    .select({ id: referrals.id, referrerUserId: referrals.referrerUserId })
    .from(referrals)
    .where(eq(referrals.referredUserId, referredUserId))
    .limit(1);
  return again[0] ?? null;
}

/**
 * markQualified — dipanggil saat referred user melakukan qualifying action
 * (mis. start trial / first paid). Idempotent. Otomatis grant reward ke
 * referrer kalau belum.
 *
 * Return referralId yang di-qualify, atau null kalau user tidak punya
 * attribution / sudah pernah qualified.
 */
export async function markQualified(referredUserId: string): Promise<string | null> {
  const rows = await db
    .select({ id: referrals.id, status: referrals.status })
    .from(referrals)
    .where(eq(referrals.referredUserId, referredUserId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  if (row.status === "pending") {
    await db
      .update(referrals)
      .set({ status: "qualified", qualifiedAt: new Date() })
      .where(and(eq(referrals.id, row.id), eq(referrals.status, "pending")));
  }

  // Grant reward (idempotent). Mark rewarded kalau berhasil.
  await grantReward(row.id);
  return row.id;
}

/**
 * grantReward — tulis satu reward row untuk referral (idempotent via unique
 * referral_id). Reward diberikan ke REFERRER. Set status referral → rewarded.
 *
 * Return reward id (baru / existing) atau null kalau referral tidak ada.
 */
export async function grantReward(referralId: string): Promise<string | null> {
  const refRows = await db
    .select({ id: referrals.id, referrerUserId: referrals.referrerUserId })
    .from(referrals)
    .where(eq(referrals.id, referralId))
    .limit(1);
  const ref = refRows[0];
  if (!ref) return null;

  const inserted = await db
    .insert(referralRewards)
    .values({
      id: ulid(),
      userId: ref.referrerUserId,
      referralId: ref.id,
      type: "credit",
      amountIdr: REWARD_AMOUNT_IDR,
      status: "granted",
    })
    .onConflictDoNothing({ target: referralRewards.referralId })
    .returning({ id: referralRewards.id });

  // Mark referral rewarded (best-effort, idempotent).
  await db
    .update(referrals)
    .set({ status: "rewarded" })
    .where(and(eq(referrals.id, ref.id), ne(referrals.status, "rewarded")));

  if (inserted[0]) return inserted[0].id;

  const existing = await db
    .select({ id: referralRewards.id })
    .from(referralRewards)
    .where(eq(referralRewards.referralId, ref.id))
    .limit(1);
  return existing[0]?.id ?? null;
}

/**
 * getAvailableCredit — total saldo kredit referral yang masih bisa dipakai
 * (status 'granted', belum 'redeemed') milik user. Integer rupiah.
 */
export async function getAvailableCredit(userId: string): Promise<number> {
  const rows = await db
    .select({ amountIdr: referralRewards.amountIdr })
    .from(referralRewards)
    .where(
      and(
        eq(referralRewards.userId, userId),
        eq(referralRewards.status, "granted"),
      ),
    );
  return rows.reduce((sum, r) => sum + (r.amountIdr ?? 0), 0);
}

export interface RedeemCreditResult {
  /** Total kredit yang dipakai (integer rupiah). */
  redeemedIdr: number;
  /** Jumlah reward row yang ditandai 'redeemed'. */
  rewardsRedeemed: number;
  /** Id reward yang di-redeem (untuk metadata invoice). */
  rewardIds: string[];
}

/**
 * redeemCreditForAmount — pakai saldo kredit referral 'granted' milik user untuk
 * menutup sebagian/seluruh `targetAmountIdr`. Strategi greedy: ambil reward dari
 * yang terlama (created_at asc), tandai 'redeemed' selama total redeem masih <=
 * targetAmountIdr. Reward bersifat all-or-nothing per row (tidak ada partial
 * redeem) supaya ledger tetap sederhana & idempotent.
 *
 * Return total yang berhasil di-redeem + id reward yang dipakai. Tidak pernah
 * melebihi targetAmountIdr. Non-throwing untuk input <= 0 (return zero result).
 */
export async function redeemCreditForAmount(
  userId: string,
  targetAmountIdr: number,
): Promise<RedeemCreditResult> {
  if (!Number.isFinite(targetAmountIdr) || targetAmountIdr <= 0) {
    return { redeemedIdr: 0, rewardsRedeemed: 0, rewardIds: [] };
  }

  const granted = await db
    .select({ id: referralRewards.id, amountIdr: referralRewards.amountIdr })
    .from(referralRewards)
    .where(
      and(
        eq(referralRewards.userId, userId),
        eq(referralRewards.status, "granted"),
      ),
    )
    .orderBy(referralRewards.createdAt);

  let redeemedIdr = 0;
  const rewardIds: string[] = [];
  for (const r of granted) {
    const amt = r.amountIdr ?? 0;
    if (amt <= 0) continue;
    if (redeemedIdr + amt > targetAmountIdr) continue; // jangan over-redeem
    // Tandai redeemed secara atomik (guard status supaya idempotent vs race).
    const updated = await db
      .update(referralRewards)
      .set({ status: "redeemed" })
      .where(and(eq(referralRewards.id, r.id), eq(referralRewards.status, "granted")))
      .returning({ id: referralRewards.id });
    if (updated[0]) {
      redeemedIdr += amt;
      rewardIds.push(updated[0].id);
    }
    if (redeemedIdr >= targetAmountIdr) break;
  }

  if (redeemedIdr > 0) {
    logger.info({ userId, redeemedIdr, rewardsRedeemed: rewardIds.length }, "Referral credit redeemed");
  }
  return { redeemedIdr, rewardsRedeemed: rewardIds.length, rewardIds };
}

/**
 * getReferralStats — ringkasan untuk halaman /referral.
 * `baseUrl` dari request headers untuk build shareable link.
 */
export async function getReferralStats(
  userId: string,
  baseUrl: string,
): Promise<ReferralStats> {
  const code = await getOrCreateCode(userId);

  const [totalRows, qualifiedRows, rewardRows] = await Promise.all([
    db
      .select({ n: count() })
      .from(referrals)
      .where(eq(referrals.referrerUserId, userId)),
    db
      .select({ n: count() })
      .from(referrals)
      .where(
        and(
          eq(referrals.referrerUserId, userId),
          ne(referrals.status, "pending"),
        ),
      ),
    db
      .select({ amountIdr: referralRewards.amountIdr })
      .from(referralRewards)
      .where(eq(referralRewards.userId, userId)),
  ]);

  const rewardIdr = rewardRows.reduce((sum, r) => sum + (r.amountIdr ?? 0), 0);

  return {
    code,
    link: buildReferralLink(code, baseUrl),
    totalReferred: totalRows[0]?.n ?? 0,
    qualified: qualifiedRows[0]?.n ?? 0,
    rewardIdr,
  };
}
