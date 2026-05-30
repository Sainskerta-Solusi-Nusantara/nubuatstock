import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { users } from "@/db/schema/auth";
import { getWhatsAppAdapter } from "./whatsapp";
import { canSendWhatsApp, type NotificationKind } from "./preferences";

const DISCLAIMER = "\n\n— Nubuat. Info edukasi, bukan ajakan jual/beli efek.";

/**
 * Kirim 1 pesan WhatsApp ke user kalau memenuhi syarat (opt-in + consent +
 * tipe aktif + bukan quiet hours + di bawah daily cap) DAN provider aktif.
 *
 * Best-effort & non-blocking: selalu return objek status, tidak pernah throw.
 * Caller (alert/dispatch) cukup memanggil tanpa try/catch ketat.
 */
export async function sendWhatsAppToUser(
  userId: string,
  kind: NotificationKind,
  message: string,
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const elig = await canSendWhatsApp(userId, kind);
    if (!elig.allowed) return { ok: false, reason: elig.reason };

    const [u] = await db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u?.phone) return { ok: false, reason: "nomor WhatsApp kosong" };

    const adapter = await getWhatsAppAdapter();
    const res = await adapter.sendText(u.phone, message + DISCLAIMER);
    if (!res.ok) {
      logger.warn({ userId, provider: adapter.name, error: res.error }, "WhatsApp gagal terkirim");
      return { ok: false, reason: res.error };
    }
    return { ok: true };
  } catch (err) {
    logger.error({ err, userId }, "sendWhatsAppToUser error");
    return { ok: false, reason: err instanceof Error ? err.message : "error" };
  }
}
