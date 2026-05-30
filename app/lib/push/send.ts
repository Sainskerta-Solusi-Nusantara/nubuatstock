import { logger } from "@/lib/logger";
import { buildVapidHeaders } from "./vapid";
import { listSubscriptions, removeByEndpoint } from "./subscriptions";

/**
 * Kirim Web Push DATA-LESS ke semua device user.
 *
 * Strategi: kirim push tanpa payload terenkripsi (cukup VAPID auth + TTL).
 * Service worker (public/sw.js) menerima event 'push' tanpa data → fetch
 * notifikasi terbaru dari /api/notifications/list lalu tampilkan. Ini
 * menghindari kompleksitas enkripsi RFC 8291 tapi tetap real-time.
 *
 * Soft-fail: kalau VAPID belum di-set → return {ok:false}, tidak throw.
 * Subscription yang 404/410 (kedaluwarsa) otomatis dihapus.
 */
export async function sendPushToUser(
  userId: string,
  _payload?: { title?: string; body?: string; url?: string },
): Promise<{ ok: boolean; sent: number; reason?: string }> {
  try {
    const subs = await listSubscriptions(userId);
    if (subs.length === 0) return { ok: false, sent: 0, reason: "tidak ada subscription" };

    let sent = 0;
    for (const sub of subs) {
      const headers = await buildVapidHeaders(sub.endpoint);
      if (!headers) return { ok: false, sent, reason: "VAPID belum dikonfigurasi" };
      try {
        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: { ...headers, TTL: "86400" },
        });
        if (res.status === 404 || res.status === 410) {
          await removeByEndpoint(sub.endpoint);
        } else if (res.ok || res.status === 201) {
          sent++;
        } else {
          logger.warn({ status: res.status, userId }, "Web push non-OK");
        }
      } catch (err) {
        logger.warn({ err, userId }, "Web push kirim gagal");
      }
    }
    return { ok: sent > 0, sent };
  } catch (err) {
    logger.error({ err, userId }, "sendPushToUser error");
    return { ok: false, sent: 0, reason: err instanceof Error ? err.message : "error" };
  }
}
