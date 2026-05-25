import { logger } from "@/lib/logger";

/**
 * Cross-feature event subscribers.
 *
 * Dipanggil sekali di worker startup (worker/index.ts). Subscribers ini
 * menghubungkan event emitter satu agent ke queue producer agent lain.
 *
 * Pattern: soft-import — kalau modul belum tersedia (development), log & skip.
 */
export async function registerEventSubscribers(): Promise<void> {
  try {
    const { subscribeEvent, getQueue } = await import("@/lib/queue/events");
    if (!subscribeEvent || !getQueue) {
      logger.warn("queue/events module incomplete — subscribers skipped");
      return;
    }

    // market.eod.ingested → trigger picks.generate + evaluate previous picks' outcomes
    await subscribeEvent("market.eod.ingested", async (payload: unknown) => {
      try {
        const data = payload as { tradeDate?: string };
        const tradeDate = data.tradeDate ?? new Date().toISOString().slice(0, 10);
        const q = await getQueue("picks.generate");
        // Generate baru
        await q.add("post-eod-generate", { tradeDate }, { removeOnComplete: 50, removeOnFail: 100 });
        // Evaluate outcomes T+1/T+5/T+20 dari picks lama
        await q.add("evaluate-outcomes", { tradeDate }, { removeOnComplete: 50, removeOnFail: 100 });
        logger.info({ tradeDate }, "Enqueued picks.generate + evaluate-outcomes after market.eod.ingested");
      } catch (err) {
        logger.error({ err }, "Failed to enqueue picks jobs from market.eod.ingested");
      }
    });

    // user.created → enqueue welcome email job (best-effort)
    await subscribeEvent("user.created", async (payload: unknown) => {
      try {
        const data = payload as { userId: string; email: string };
        const q = await getQueue("notifications.send");
        await q.add(
          "welcome-email",
          { ...data, type: "welcome" },
          { removeOnComplete: 100, removeOnFail: 200, attempts: 3, backoff: { type: "exponential", delay: 5000 } },
        );
      } catch (err) {
        logger.error({ err }, "Failed to enqueue welcome email on user.created");
      }
    });

    // alert.triggered → push notification user (channels: in_app + push + email per user preference)
    await subscribeEvent("alert.triggered", async (payload: unknown) => {
      try {
        const data = payload as { userId: string; companyKode: string; alertName: string; snapshot: unknown };
        const notif = await import("@/lib/notifications");
        const send = (notif as { sendNotification?: (args: unknown) => Promise<unknown> }).sendNotification;
        if (!send) return;
        await send({
          userId: data.userId,
          templateKey: "alert.price_triggered",
          variables: { ticker: data.companyKode, alert_name: data.alertName, snapshot: data.snapshot },
          severity: "warning",
        });
      } catch (err) {
        logger.error({ err }, "Failed to dispatch alert.triggered notification");
      }
    });

    // picks.generated → broadcast notification ke user yang opted-in
    await subscribeEvent("picks.generated", async (payload: unknown) => {
      try {
        const data = payload as { tradeDate: string; count: number };
        logger.info({ ...data }, "Daily picks ready — notification fan-out can be queued here");
      } catch (err) {
        logger.error({ err }, "Failed to handle picks.generated");
      }
    });

    logger.info("Event subscribers registered");
  } catch (err) {
    logger.error({ err }, "Failed to register event subscribers — worker will run without cross-feature wiring");
  }
}
