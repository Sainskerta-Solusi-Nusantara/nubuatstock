import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import { supportFeedback } from "@/db/schema/support";
import { getActiveSubscription } from "@/lib/billing/subscriptions";

/**
 * Gate feedback wajib untuk user TRIAL.
 *
 * Aturan bisnis: setelah 3 jam sejak mendaftar, user yang masih TRIAL wajib
 * memberi feedback (rating 1–5 + pesan) dulu sebelum bisa melanjutkan trial
 * gratisnya (trial total 1 hari). Feedback disimpan ke `support_feedback`
 * (ditandai metadata.source = "trial_gate") supaya bisa dievaluasi tim di superadmin.
 */

export const TRIAL_FEEDBACK_SOURCE = "trial_gate";
const TRIAL_FEEDBACK_AFTER_MS = 3 * 60 * 60 * 1000; // 3 jam

export interface TrialFeedbackGateStatus {
  required: boolean;
  /** ISO string kapan trial berakhir (untuk konteks di UI). */
  trialEndsAt: string | null;
}

export async function getTrialFeedbackGate(userId: string): Promise<TrialFeedbackGateStatus> {
  const notRequired: TrialFeedbackGateStatus = { required: false, trialEndsAt: null };

  // 1) Harus sedang trialing.
  const active = await getActiveSubscription(userId);
  if (!active || active.subscription.status !== "trialing") return notRequired;

  const trialEndsAt = active.subscription.trialEndsAt
    ? new Date(active.subscription.trialEndsAt)
    : null;

  // Kalau trial sudah lewat, biarkan mekanisme expiry normal yang menangani.
  if (trialEndsAt && trialEndsAt.getTime() <= Date.now()) return notRequired;

  // 2) Sudah ≥ 3 jam sejak daftar?
  const [u] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u?.createdAt) return notRequired;
  const elapsed = Date.now() - new Date(u.createdAt).getTime();
  if (elapsed < TRIAL_FEEDBACK_AFTER_MS) return notRequired;

  // 3) Belum pernah submit feedback gate trial?
  const [existing] = await db
    .select({ id: supportFeedback.id })
    .from(supportFeedback)
    .where(
      and(
        eq(supportFeedback.userId, userId),
        sql`${supportFeedback.metadata} ->> 'source' = ${TRIAL_FEEDBACK_SOURCE}`,
      ),
    )
    .limit(1);
  if (existing) return notRequired;

  return {
    required: true,
    trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
  };
}
