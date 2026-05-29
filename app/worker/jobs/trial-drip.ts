import type { Processor } from "bullmq";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import { userSubscriptions } from "@/db/schema/billing";
import { getConfig } from "@/lib/config";
import { sendEmail, renderTrialDripEmail, type TrialDripStage } from "@/lib/notifications/email";
import { logger } from "@/lib/logger";

/**
 * Trial drip campaign (IMPROVEMENT_PLAN §8.5 #35).
 *
 * Job harian: cari user berstatus `trialing` (tier Pro 7 hari) dan kirim email
 * berjenjang untuk mendorong konversi ke paid sebelum auto-downgrade ke Free
 * (lihat worker/jobs/expire-trial.ts):
 *
 *   - D+3 (>=3 hari sejak trial mulai): perkenalkan fitur Pro yang sering dilewat.
 *   - D+5 (>=5 hari): "trial tinggal 2 hari" + value recap / social proof.
 *   - D+6 (>=6 hari, H-1 sebelum habis): "besok turun ke Free, upgrade sekarang".
 *
 * Idempotency / dedup:
 *   Tidak ada tabel sent-emails khusus, jadi dedup pakai flag di
 *   `user_subscriptions.metadata` jsonb — key `dripSent` berisi map
 *   `{ d3: ISODate, d5: ISODate, d6: ISODate }`. Sebelum kirim, cek apakah
 *   stage sudah ada. Setelah kirim sukses, tandai. Aman dari double-send
 *   walau job dijalankan ulang di hari yang sama.
 *
 * Anti-kirim-ke-yang-sudah-upgrade:
 *   Hanya proses row dengan status `trialing`. Begitu user upgrade (status
 *   jadi `active` berbayar via activatePaidSubscription) atau trial expired,
 *   row tidak lagi `trialing` → otomatis tidak ikut campaign.
 *
 * Cron schedule: `0 9 * * *` (09:00 WIB tiap hari) — di-bootstrap di scheduler,
 * di-route oleh generatePicksAdapter ke processor ini (job name "trial-drip").
 */

const DRIP_STAGES = ["d3", "d5", "d6"] as const;

/** Map stage → hari trial minimum (inklusif) sejak trial dimulai. */
const STAGE_DAY_THRESHOLD: Record<TrialDripStage, number> = {
  d3: 3,
  d5: 5,
  d6: 6,
};

export type DripSentMap = Partial<Record<TrialDripStage, string>>;

/**
 * Pure logic: tentukan stage drip mana yang harus dikirim sekarang.
 *
 * Aturan:
 *  - Hitung umur trial dalam hari penuh = floor((now - trialStartedAt) / 24h).
 *  - Pilih stage dengan threshold tertinggi yang <= umur trial DAN belum dikirim.
 *    (Kalau job sempat skip beberapa hari, langsung kirim stage terbaru yang
 *     relevan — bukan menumpuk semua email sekaligus.)
 *  - Jangan kirim stage apa pun setelah trial berakhir (now >= trialEndsAt):
 *    user akan di-handle expire-trial + email "trial expired".
 *  - Kembalikan null kalau tidak ada yang perlu dikirim.
 *
 * Fungsi murni — tanpa I/O — supaya gampang di-test.
 */
export function selectDripStage(args: {
  now: Date;
  trialStartedAt: Date;
  trialEndsAt: Date;
  alreadySent: DripSentMap;
}): TrialDripStage | null {
  const { now, trialStartedAt, trialEndsAt, alreadySent } = args;

  // Trial sudah berakhir → jangan kirim drip lagi.
  if (now.getTime() >= trialEndsAt.getTime()) return null;

  const ageMs = now.getTime() - trialStartedAt.getTime();
  if (ageMs < 0) return null;
  const ageDays = Math.floor(ageMs / 86_400_000);

  // Stage terbaru yang sudah eligible (threshold <= umur) dan belum dikirim.
  // Iterate dari yang paling lambat (d6) ke paling awal (d3).
  for (const stage of [...DRIP_STAGES].reverse()) {
    if (ageDays >= STAGE_DAY_THRESHOLD[stage] && !alreadySent[stage]) {
      return stage;
    }
  }
  return null;
}

/** Ambil trial start date dari metadata.trialStartedAt, fallback ke startedAt. */
export function resolveTrialStartedAt(
  metadata: Record<string, unknown> | null | undefined,
  startedAt: Date,
): Date {
  const raw = metadata?.["trialStartedAt"];
  if (typeof raw === "string") {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return startedAt;
}

/** Baca map drip yang sudah dikirim dari metadata. */
export function readDripSent(metadata: Record<string, unknown> | null | undefined): DripSentMap {
  const raw = metadata?.["dripSent"];
  if (raw && typeof raw === "object") {
    return raw as DripSentMap;
  }
  return {};
}

export const trialDripProcessor: Processor = async () => {
  logger.info("Running trial drip campaign job...");

  const trialing = await db
    .select({
      id: userSubscriptions.id,
      userId: userSubscriptions.userId,
      startedAt: userSubscriptions.startedAt,
      trialEndsAt: userSubscriptions.trialEndsAt,
      metadata: userSubscriptions.metadata,
    })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.status, "trialing"));

  if (trialing.length === 0) {
    logger.info("No trialing subscriptions for drip");
    return { processed: 0, sent: 0 };
  }

  const [appName, supportEmail, subscriptionUrl] = await Promise.all([
    getConfig<string>("app.name", { defaultValue: "Nubuat" }),
    getConfig<string>("app.support_email", { defaultValue: "support@nubuat.id" }),
    getConfig<string>("app.subscription_url", { defaultValue: "https://nubuat.id/subscription" }),
  ]);

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const sub of trialing) {
    try {
      if (!sub.trialEndsAt) {
        skipped++;
        continue;
      }

      const metadata = (sub.metadata as Record<string, unknown> | null) ?? {};
      const alreadySent = readDripSent(metadata);
      const trialStartedAt = resolveTrialStartedAt(metadata, sub.startedAt);

      const stage = selectDripStage({
        now,
        trialStartedAt,
        trialEndsAt: sub.trialEndsAt,
        alreadySent,
      });

      if (!stage) {
        skipped++;
        continue;
      }

      // Resolve user email (skip kalau user hilang).
      const userRow = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, sub.userId))
        .limit(1);
      if (userRow.length === 0) {
        skipped++;
        continue;
      }
      const user = userRow[0]!;

      const { subject, html, text } = renderTrialDripEmail({
        appName,
        userName: user.name ?? user.email.split("@")[0]!,
        stage,
        trialEndsAt: sub.trialEndsAt,
        subscriptionUrl,
        supportEmail,
      });

      const result = await sendEmail({
        to: user.email,
        subject,
        html,
        text,
        tags: [
          { name: "type", value: "trial_drip" },
          { name: "stage", value: stage },
          { name: "user_id", value: sub.userId },
        ],
      });

      if (!result.ok) {
        // Jangan tandai terkirim kalau gagal → akan dicoba lagi job berikutnya.
        logger.warn({ userId: sub.userId, stage, err: result.error }, "Trial drip email failed");
        errors++;
        continue;
      }

      // Tandai stage terkirim di metadata. Conditional update pada status
      // "trialing" supaya tidak menimpa kalau user sudah upgrade di tengah jalan.
      const nextDripSent: DripSentMap = { ...alreadySent, [stage]: now.toISOString() };
      await db
        .update(userSubscriptions)
        .set({
          metadata: { ...metadata, dripSent: nextDripSent },
          updatedAt: now,
        })
        .where(
          and(eq(userSubscriptions.id, sub.id), eq(userSubscriptions.status, "trialing")),
        );

      sent++;
    } catch (err) {
      logger.error({ err, subId: sub.id, userId: sub.userId }, "Failed to process trial drip");
      errors++;
    }
  }

  logger.info({ processed: trialing.length, sent, skipped, errors }, "Trial drip campaign done");
  return { processed: trialing.length, sent, skipped, errors };
};
