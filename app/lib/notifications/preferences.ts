import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationPreferences, type NotificationPreferences } from "@/db/schema/notification-prefs";
import { notifications, notificationDeliveries } from "@/db/schema/notifications";

/** Tipe notifikasi yang bisa di-toggle user. */
export type NotificationKind = "alerts" | "dailyPicks" | "news";

/** Ambil preferensi user; buat default kalau belum ada. */
export async function getOrCreatePreferences(userId: string): Promise<NotificationPreferences> {
  const [existing] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(notificationPreferences)
    .values({ userId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  // Race: row dibuat paralel → ambil lagi.
  const [row] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return row!;
}

export interface UpdatePreferencesInput {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  whatsappEnabled?: boolean;
  alertsEnabled?: boolean;
  dailyPicksEnabled?: boolean;
  newsEnabled?: boolean;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
  dailyCap?: number;
}

export async function updatePreferences(
  userId: string,
  patch: UpdatePreferencesInput,
): Promise<NotificationPreferences> {
  await getOrCreatePreferences(userId);

  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of [
    "inAppEnabled",
    "emailEnabled",
    "alertsEnabled",
    "dailyPicksEnabled",
    "newsEnabled",
    "quietHoursStart",
    "quietHoursEnd",
    "dailyCap",
  ] as const) {
    if (patch[k] !== undefined) set[k] = patch[k];
  }

  // Opt-in WhatsApp: saat dinyalakan pertama kali, stempel consent.
  if (patch.whatsappEnabled !== undefined) {
    set.whatsappEnabled = patch.whatsappEnabled;
    if (patch.whatsappEnabled) {
      const cur = await getOrCreatePreferences(userId);
      if (!cur.whatsappConsentAt) set.whatsappConsentAt = new Date();
    }
  }

  const [updated] = await db
    .update(notificationPreferences)
    .set(set)
    .where(eq(notificationPreferences.userId, userId))
    .returning();
  return updated!;
}

function kindEnabled(prefs: NotificationPreferences, kind: NotificationKind): boolean {
  switch (kind) {
    case "alerts":
      return prefs.alertsEnabled;
    case "dailyPicks":
      return prefs.dailyPicksEnabled;
    case "news":
      return prefs.newsEnabled;
  }
}

/** Apakah sekarang masuk quiet hours user (jam WIB). */
export function inQuietHours(prefs: NotificationPreferences, now = new Date()): boolean {
  const { quietHoursStart: s, quietHoursEnd: e } = prefs;
  if (s == null || e == null || s === e) return false;
  // Jam WIB (UTC+7).
  const hourWib = (now.getUTCHours() + 7) % 24;
  if (s < e) return hourWib >= s && hourWib < e;
  // Lewat tengah malam (mis. 22→6).
  return hourWib >= s || hourWib < e;
}

/** Hitung jumlah WhatsApp delivery hari ini (untuk daily cap). */
export async function whatsappSentToday(userId: string, now = new Date()): Promise<number> {
  const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notificationDeliveries)
    .innerJoin(notifications, eq(notifications.id, notificationDeliveries.notificationId))
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notificationDeliveries.channel, "whatsapp"),
        eq(notificationDeliveries.status, "sent"),
        gte(notificationDeliveries.createdAt, startUtc),
      ),
    );
  return rows[0]?.n ?? 0;
}

export interface WaEligibility {
  allowed: boolean;
  reason?: string;
}

/**
 * Boleh kirim WhatsApp ke user untuk tipe `kind`?
 * Cek: opt-in + consent + tipe aktif + quiet hours + daily cap.
 */
export async function canSendWhatsApp(
  userId: string,
  kind: NotificationKind,
  now = new Date(),
): Promise<WaEligibility> {
  const prefs = await getOrCreatePreferences(userId);
  if (!prefs.whatsappEnabled || !prefs.whatsappConsentAt) {
    return { allowed: false, reason: "belum opt-in WhatsApp" };
  }
  if (!kindEnabled(prefs, kind)) return { allowed: false, reason: `tipe ${kind} dimatikan` };
  if (inQuietHours(prefs, now)) return { allowed: false, reason: "quiet hours" };
  if (prefs.dailyCap > 0) {
    const sent = await whatsappSentToday(userId, now);
    if (sent >= prefs.dailyCap) return { allowed: false, reason: "daily cap tercapai" };
  }
  return { allowed: true };
}
