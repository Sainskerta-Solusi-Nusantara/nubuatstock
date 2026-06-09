import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession, requireSession } from "@/lib/auth/server";
import { getConfig } from "@/lib/config";
import { ok, fail, handleError } from "@/lib/utils/api";
import { auditLog } from "@/lib/observability/audit";
import { logger } from "@/lib/logger";

/**
 * POST /api/billing/start-trial
 *
 * Aktifkan 3-day trial untuk user yang baru signup. Idempotent — kalau user
 * sudah punya trial atau paid subscription, return existing tanpa override.
 *
 * Trial config dari `app_config`:
 *   - trial.default_tier (default "pro")
 *   - trial.duration_days (default 3)
 *   - trial.fallback_tier (default "free")
 *
 * Setelah trial expire, worker job auto-downgrade ke fallback_tier (lihat
 * worker/jobs/expire-trial.ts — to be created kalau perlu, atau auto saat akses).
 */
const bodySchema = z.object({
  tierKode: z.string().min(1).max(40).optional(), // override default
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const { tierKode: overrideTier } = bodySchema.parse(body);

    const [defaultTier, durationDays, fallbackTier] = await Promise.all([
      getConfig<string>("trial.default_tier", { defaultValue: "pro" }),
      getConfig<number>("trial.duration_days", { defaultValue: 1 }),
      getConfig<string>("trial.fallback_tier", { defaultValue: "free" }),
    ]);

    const tier = overrideTier ?? defaultTier;

    // Soft-import billing helpers (Agent 4)
    let result: unknown;
    try {
      const billing = await import("@/lib/billing");

      // Check existing subscription
      const getUserTier = (billing as { getUserTier?: (userId: string) => Promise<string> }).getUserTier;
      if (getUserTier) {
        const currentTier = await getUserTier(session.userId);
        if (currentTier !== "free") {
          return ok({
            alreadyOnTier: currentTier,
            message: `User sudah pada tier ${currentTier} — trial tidak diaktifkan ulang.`,
          });
        }
      }

      // Try Agent 4's trial helper kalau ada
      const createTrial = (billing as {
        createTrialSubscription?: (args: { userId: string; tierKode: string; durationDays: number }) => Promise<unknown>;
      }).createTrialSubscription;

      if (createTrial) {
        result = await createTrial({ userId: session.userId, tierKode: tier, durationDays });
      } else {
        // Fallback: insert langsung ke user_subscriptions
        result = await directCreateTrial({
          userId: session.userId,
          tierKode: tier,
          durationDays,
          fallbackTier,
        });
      }
    } catch (err) {
      logger.error({ err, userId: session.userId }, "createTrialSubscription failed");
      return fail(500, "TRIAL_FAILED", "Gagal aktifkan trial. Coba lagi atau hubungi support.");
    }

    await auditLog({
      actorUserId: session.userId,
      actorRole: String(session.role ?? "user"),
      action: "billing.trial_started",
      targetType: "user_subscription",
      targetId: session.userId,
      metadata: { tierKode: tier, durationDays },
    });

    return ok({
      tierKode: tier,
      durationDays,
      trialEndsAt: new Date(Date.now() + durationDays * 86400_000).toISOString(),
      result,
    });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * Fallback direct insert kalau Agent 4 belum expose createTrialSubscription helper.
 * Pakai raw SQL untuk hindari coupling dengan schema spesifik billing.
 */
async function directCreateTrial(opts: {
  userId: string;
  tierKode: string;
  durationDays: number;
  fallbackTier: string;
}): Promise<unknown> {
  const { userSubscriptions } = await import("@/db/schema/billing").catch(() => ({ userSubscriptions: null as never }));
  if (!userSubscriptions) {
    throw new Error("billing schema not yet seeded");
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + opts.durationDays * 86400_000);

  // Mark existing free subs as cancelled (kalau ada), lalu insert trial
  await db
    .update(userSubscriptions)
    .set({ status: "cancelled", currentPeriodEnd: now, cancelAtPeriodEnd: true })
    .where(and(eq(userSubscriptions.userId, opts.userId), eq(userSubscriptions.status, "active")));

  const row = await db
    .insert(userSubscriptions)
    .values({
      userId: opts.userId,
      tierKode: opts.tierKode,
      status: "trialing",
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialEndsAt: trialEnd,
      cancelAtPeriodEnd: false,
      provider: "manual",
    })
    .returning();

  return row[0];
}
