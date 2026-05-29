import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ulid, ulidRef, withTimestamps } from "./_base";
import { users } from "./auth";

/**
 * Referral program v1 — setiap user dapat referral code/link, signup baru
 * di-attribute ke referrer, dan referrer dapat reward credit.
 *
 * Konvensi:
 * - PK ULID (text) konsisten dengan _base.ts.
 * - FK `user_id` / `*_user_id` → `auth.users.id` (soft FK via ulidRef + references).
 * - Money sebagai integer rupiah (`amount_idr`).
 *
 * Tabel:
 * - `referral_codes`   — satu code unik per user (dibuat lazily saat user buka /referral).
 * - `referrals`        — attribution record: siapa mengajak siapa. Satu referrer per
 *                        referred user (unique referred_user_id). Status: pending →
 *                        qualified → rewarded.
 * - `referral_rewards` — reward ledger. Redemption (integrasi billing) menyusul; di sini
 *                        hanya pencatatan. Status: granted → redeemed.
 */

// =================== Enums ===================

export const referralStatusEnum = pgEnum("referral_status", [
  "pending",
  "qualified",
  "rewarded",
]);

export const referralRewardTypeEnum = pgEnum("referral_reward_type", ["credit"]);

export const referralRewardStatusEnum = pgEnum("referral_reward_status", [
  "granted",
  "redeemed",
]);

// =================== Tables ===================

/**
 * `referral_codes` — short slug unik per user. Satu user satu code (unique user_id).
 */
export const referralCodes = pgTable(
  "referral_codes",
  {
    id: ulid(),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("referral_codes_user_uq").on(t.userId),
    uniqueIndex("referral_codes_code_uq").on(t.code),
  ],
);

/**
 * `referrals` — attribution record. `referred_user_id` unik supaya satu user hanya
 * bisa di-attribute ke satu referrer (idempotent, no double-attribution).
 */
export const referrals = pgTable(
  "referrals",
  {
    id: ulid(),
    referrerUserId: ulidRef("referrer_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    referredUserId: ulidRef("referred_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    code: text("code").notNull(),
    status: referralStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    qualifiedAt: timestamp("qualified_at", { withTimezone: true, mode: "date" }),
  },
  (t) => [
    uniqueIndex("referrals_referred_user_uq").on(t.referredUserId),
    index("referrals_referrer_idx").on(t.referrerUserId),
    index("referrals_status_idx").on(t.status),
    index("referrals_code_idx").on(t.code),
  ],
);

/**
 * `referral_rewards` — reward ledger. Satu reward per referral (unique referral_id)
 * supaya grantReward idempotent. Redemption ke billing credit dilakukan LATER.
 */
export const referralRewards = pgTable(
  "referral_rewards",
  {
    id: ulid(),
    userId: ulidRef("user_id").references(() => users.id, { onDelete: "cascade" }),
    referralId: ulidRef("referral_id").references(() => referrals.id, {
      onDelete: "cascade",
    }),
    type: referralRewardTypeEnum("type").notNull().default("credit"),
    amountIdr: integer("amount_idr").notNull(),
    status: referralRewardStatusEnum("status").notNull().default("granted"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("referral_rewards_referral_uq").on(t.referralId),
    index("referral_rewards_user_idx").on(t.userId),
    index("referral_rewards_status_idx").on(t.status),
  ],
);

// =================== Drizzle inferred types ===================

export type ReferralCode = typeof referralCodes.$inferSelect;
export type NewReferralCode = typeof referralCodes.$inferInsert;

export type Referral = typeof referrals.$inferSelect;
export type NewReferral = typeof referrals.$inferInsert;

export type ReferralReward = typeof referralRewards.$inferSelect;
export type NewReferralReward = typeof referralRewards.$inferInsert;
