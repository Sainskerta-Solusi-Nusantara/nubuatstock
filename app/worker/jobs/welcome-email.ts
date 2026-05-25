import type { Processor } from "bullmq";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";
import { userSubscriptions } from "@/db/schema/billing";
import { getConfig } from "@/lib/config";
import { sendEmail, renderWelcomeEmail } from "@/lib/notifications/email";
import { logger } from "@/lib/logger";

/**
 * Send welcome email — di-trigger oleh user.created event subscriber.
 * Best-effort: kalau email service belum di-set, silent skip.
 */
export const welcomeEmailProcessor: Processor = async (job) => {
  const payload = job.data as { userId: string; email: string };
  if (!payload?.userId) return { skipped: "no_user_id" };

  const userRow = await db.select({ name: users.name, email: users.email })
    .from(users).where(eq(users.id, payload.userId)).limit(1);
  if (userRow.length === 0) return { skipped: "user_not_found" };
  const user = userRow[0]!;

  const subRow = await db.select({ tier: userSubscriptions.tierKode, trialEndsAt: userSubscriptions.trialEndsAt, status: userSubscriptions.status })
    .from(userSubscriptions).where(eq(userSubscriptions.userId, payload.userId)).limit(1);
  const sub = subRow[0];

  const [appName, supportEmail] = await Promise.all([
    getConfig<string>("app.name", { defaultValue: "Nubuat" }),
    getConfig<string>("app.support_email", { defaultValue: "support@nubuat.id" }),
  ]);

  const { subject, html, text } = renderWelcomeEmail({
    appName,
    userName: user.name ?? user.email.split("@")[0]!,
    trialActive: sub?.status === "trialing",
    trialEndsAt: sub?.trialEndsAt ?? undefined,
    supportEmail,
  });

  const result = await sendEmail({
    to: user.email,
    subject,
    html,
    text,
    tags: [
      { name: "type", value: "welcome" },
      { name: "user_id", value: payload.userId },
    ],
  });

  if (!result.ok) {
    logger.warn({ userId: payload.userId, err: result.error }, "Welcome email failed");
    return { sent: false, error: result.error };
  }

  return { sent: true, messageId: result.messageId };
};
