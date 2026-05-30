import { and, asc, count, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { alerts, alertTriggers } from "@/db/schema/user-data";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { publishEvent, requireEntitlement } from "@/lib/watchlist/cross-deps";
import type {
  Alert,
  AlertTrigger,
  AlertTriggeredEvent,
  CreateAlertInput,
  ListAlertsQuery,
  UpdateAlertInput,
} from "@/lib/types/alerts";
import { ALERT_EVENTS } from "./events";

const QUOTA_KEY_ALERTS = "alerts.max_active";

async function getOwnedAlert(userId: string, alertId: string): Promise<Alert> {
  const row = await db
    .select()
    .from(alerts)
    .where(
      and(eq(alerts.id, alertId), eq(alerts.userId, userId), isNull(alerts.deletedAt)),
    )
    .limit(1);
  if (!row[0]) throw new NotFoundError("Alert");
  return row[0];
}

export async function listAlerts(
  userId: string,
  query: ListAlertsQuery = { limit: 100, offset: 0 },
): Promise<{ items: Alert[]; total: number }> {
  const conditions: SQL[] = [eq(alerts.userId, userId), isNull(alerts.deletedAt)];
  if (query.status) conditions.push(eq(alerts.status, query.status));
  if (query.companyKode) conditions.push(eq(alerts.companyKode, query.companyKode));

  const where = and(...conditions)!;

  const [items, totals] = await Promise.all([
    db
      .select()
      .from(alerts)
      .where(where)
      .orderBy(desc(alerts.createdAt))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ total: count() }).from(alerts).where(where),
  ]);
  return { items, total: totals[0]?.total ?? 0 };
}

export async function createAlert(
  userId: string,
  input: CreateAlertInput,
): Promise<Alert> {
  // Quota: count active alerts user, must remain under tier limit AFTER add.
  const activeCount = await db
    .select({ total: count() })
    .from(alerts)
    .where(
      and(
        eq(alerts.userId, userId),
        eq(alerts.status, "active"),
        isNull(alerts.deletedAt),
      ),
    );
  const current = activeCount[0]?.total ?? 0;
  await requireEntitlement(userId, QUOTA_KEY_ALERTS, (limit) => current < limit);

  const inserted = await db
    .insert(alerts)
    .values({
      userId,
      companyKode: input.companyKode,
      name: input.name,
      condition: input.condition,
      channels: input.channels,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      status: "active",
      repeatable: input.repeatable ? "true" : "false",
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("Failed to insert alert");
  await publishEvent(ALERT_EVENTS.CREATED, {
    alertId: row.id,
    userId,
    companyKode: row.companyKode,
  });
  return row;
}

export async function updateAlert(
  userId: string,
  alertId: string,
  input: UpdateAlertInput,
): Promise<Alert> {
  await getOwnedAlert(userId, alertId);
  const update: Partial<typeof alerts.$inferInsert> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.condition !== undefined) update.condition = input.condition;
  if (input.channels !== undefined) update.channels = input.channels;
  if (input.expiresAt !== undefined) {
    update.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  }
  if (input.repeatable !== undefined) update.repeatable = input.repeatable ? "true" : "false";
  const updated = await db
    .update(alerts)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(alerts.id, alertId))
    .returning();
  const row = updated[0];
  if (!row) throw new NotFoundError("Alert");
  return row;
}

export async function pauseAlert(userId: string, alertId: string): Promise<Alert> {
  await getOwnedAlert(userId, alertId);
  const updated = await db
    .update(alerts)
    .set({ status: "paused", updatedAt: new Date() })
    .where(eq(alerts.id, alertId))
    .returning();
  const row = updated[0]!;
  await publishEvent(ALERT_EVENTS.PAUSED, { alertId, userId });
  return row;
}

export async function resumeAlert(userId: string, alertId: string): Promise<Alert> {
  const existing = await getOwnedAlert(userId, alertId);
  if (existing.expiresAt && existing.expiresAt.getTime() < Date.now()) {
    // sudah kadaluwarsa — biarkan status sebagai expired
    const updated = await db
      .update(alerts)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(alerts.id, alertId))
      .returning();
    return updated[0]!;
  }
  const updated = await db
    .update(alerts)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(alerts.id, alertId))
    .returning();
  const row = updated[0]!;
  await publishEvent(ALERT_EVENTS.RESUMED, { alertId, userId });
  return row;
}

export async function deleteAlert(userId: string, alertId: string): Promise<void> {
  await getOwnedAlert(userId, alertId);
  await db
    .update(alerts)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(alerts.id, alertId));
}

export async function listTriggers(
  userId: string,
  alertId: string,
  limit = 50,
  offset = 0,
): Promise<AlertTrigger[]> {
  await getOwnedAlert(userId, alertId);
  return db
    .select()
    .from(alertTriggers)
    .where(eq(alertTriggers.alertId, alertId))
    .orderBy(desc(alertTriggers.triggeredAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Write trigger row + update alert status. Caller (worker) sudah memvalidasi
 * triggered via `evaluateCondition`. Idempotensi sederhana: re-trigger dalam
 * window pendek (default 60 dtk) di-dedupe oleh worker.
 *
 * - Repeatable alert: status tetap `active`.
 * - One-shot alert: status → `triggered` (sembunyikan dari worker grouping).
 */
export async function triggerAlert(
  alertId: string,
  snapshot: Record<string, unknown>,
  notifiedChannels: string[] = [],
): Promise<void> {
  const triggered = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.id, alertId), isNull(alerts.deletedAt)))
    .limit(1);
  const alert = triggered[0];
  if (!alert) {
    logger.warn({ alertId }, "triggerAlert: alert not found");
    return;
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(alertTriggers).values({
      alertId,
      triggeredAt: now,
      snapshot,
      notifiedChannels: notifiedChannels.length
        ? (notifiedChannels as ("in_app" | "email" | "push")[])
        : [],
    });
    const nextStatus = alert.repeatable === "true" ? "active" : "triggered";
    await tx
      .update(alerts)
      .set({
        status: nextStatus,
        lastTriggeredAt: now,
        triggerCount: sql`${alerts.triggerCount} + 1`,
        updatedAt: now,
      })
      .where(eq(alerts.id, alertId));
  });

  // Payload SHAPE harus match Agent 10 `alertTriggeredSchema` di lib/queue/events.ts.
  // Detail extra (snapshot, channels) di-persist ke `alert_triggers` table.
  const summary = summarizeConditionForEvent(alert.condition);
  const payload = {
    alertId,
    userId: alert.userId,
    companyKode: alert.companyKode,
    conditionSummary: summary,
    triggeredAt: now.toISOString(),
  };
  await publishEvent(ALERT_EVENTS.TRIGGERED, payload);

  // Full structured payload tetap dipancarkan ke logger untuk observability.
  const fullEvent: AlertTriggeredEvent = {
    alertId,
    userId: alert.userId,
    companyKode: alert.companyKode,
    triggeredAt: now.toISOString(),
    condition: alert.condition as AlertTriggeredEvent["condition"],
    snapshot,
    channels: alert.channels as AlertTriggeredEvent["channels"],
  };
  logger.debug({ event: ALERT_EVENTS.TRIGGERED, payload: fullEvent }, "alert.triggered detail");

  // Kirim ringkasan via WhatsApp ke pemilik alert. Non-blocking & soft-fail:
  // kegagalan WA TIDAK boleh menggagalkan trigger (row sudah tersimpan di atas).
  // `dispatchAlertWhatsApp` menelan semua error sendiri; `void` agar tidak menunggu.
  void dispatchAlertWhatsApp({
    userId: alert.userId,
    companyKode: alert.companyKode,
    condition: alert.condition,
    snapshot,
  });
}

/**
 * Susun pesan WhatsApp ringkas lalu kirim via wa-dispatch (yang sudah handle
 * opt-in/consent/quiet-hours/daily-cap + disclaimer + soft-fail). Dynamic import
 * dipakai untuk menghindari circular dep antara lib/alerts dan lib/notifications.
 *
 * Best-effort: semua error ditelan di sini supaya trigger tetap sukses. Kalau
 * provider WA "none"/belum di-set, wa-dispatch mengembalikan { ok:false } tanpa
 * throw — jadi tidak ada error yang bocor.
 */
async function dispatchAlertWhatsApp(args: {
  userId: string;
  companyKode: string;
  condition: unknown;
  snapshot: Record<string, unknown>;
}): Promise<void> {
  try {
    const condText = summarizeConditionForEvent(args.condition);
    const priceText = formatTriggerPrice(args.snapshot);
    const pricePart = priceText ? `harga ${priceText} — ` : "";
    // Disclaimer ditambahkan otomatis oleh wa-dispatch — JANGAN dobel di sini.
    const message = `🔔 Alert ${args.companyKode}: ${pricePart}${condText}. Cek di Nubuat.`;

    const { sendWhatsAppToUser } = await import("@/lib/notifications/wa-dispatch");
    await sendWhatsAppToUser(args.userId, "alerts", message);
  } catch (err) {
    logger.warn({ err, userId: args.userId }, "dispatchAlertWhatsApp gagal (diabaikan)");
  }
}

/**
 * Ambil harga terkini dari snapshot evaluasi untuk pesan WA. Snapshot dibentuk
 * `evaluateCondition`; untuk kondisi harga field-nya `last`. Defensif: kalau tak
 * ada angka harga (mis. volume_spike/ma_cross), return null dan pesan dikirim
 * tanpa bagian harga.
 */
function formatTriggerPrice(snapshot: Record<string, unknown>): string | null {
  const v = snapshot["last"];
  if (typeof v === "number" && Number.isFinite(v)) {
    return v.toLocaleString("id-ID");
  }
  return null;
}

function summarizeConditionForEvent(condition: unknown): string {
  if (!condition || typeof condition !== "object") return "alert";
  const c = condition as { type?: string; params?: Record<string, unknown> };
  if (!c.type) return "alert";
  const params = c.params ?? {};
  switch (c.type) {
    case "price_above":
      return `Harga > ${String(params.value ?? "")}`;
    case "price_below":
      return `Harga < ${String(params.value ?? "")}`;
    case "pct_change":
      return `Perubahan ${String(params.direction ?? "")} ${String(params.changePct ?? "")}% (${String(params.window ?? "")})`;
    case "volume_spike":
      return `Volume ≥ ${String(params.multiple ?? "")}x rata-rata`;
    case "ma_cross":
      return `${String(params.direction ?? "")} cross MA${String(params.fast ?? "")}/${String(params.slow ?? "")}`;
    case "rsi_threshold":
      return `RSI(${String(params.period ?? "")}) ${String(params.direction ?? "")} ${String(params.threshold ?? "")}`;
    default:
      return c.type;
  }
}

/**
 * Worker helper: ambil active alerts grouped by company_kode (paginated batch).
 * Filter expired di sini supaya worker tetap simple.
 */
export async function listActiveAlertsByCompany(
  batchLimit = 500,
): Promise<Map<string, Alert[]>> {
  const now = new Date();
  // Expire alerts that are past expiresAt
  await db
    .update(alerts)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(alerts.status, "active"),
        sql`${alerts.expiresAt} is not null and ${alerts.expiresAt} < ${now}`,
      ),
    );

  const rows = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.status, "active"), isNull(alerts.deletedAt)))
    .orderBy(asc(alerts.companyKode))
    .limit(batchLimit);

  const map = new Map<string, Alert[]>();
  for (const r of rows) {
    const list = map.get(r.companyKode) ?? [];
    list.push(r);
    map.set(r.companyKode, list);
  }
  return map;
}
