/**
 * Worker job: `check-alerts`.
 *
 * Schedule: tiap 1 menit di jam bursa (config `runtime.market.session.*` ditangani Agent 10).
 * Tugas:
 *   1. Ambil active alerts grouped by company_kode (batching).
 *   2. Fetch evaluation context batch via Agent 5 (`getEvaluationContext`).
 *   3. Evaluate dengan `evaluateCondition`.
 *   4. Kalau triggered → `triggerAlert(...)` (persist + emit event).
 *
 * Catatan deteksi duplikat:
 *   Alert non-repeatable otomatis berpindah ke status `triggered` setelah hit pertama
 *   sehingga round berikutnya tidak akan re-evaluate. Untuk repeatable alert,
 *   worker akan respect `runtime.alerts.cooldown_seconds` (DB config) supaya tidak spam.
 *
 * Kontrak BullMQ job-handler:
 *   `export const checkAlertsJob: { name; handler: () => Promise<JobResult>; }`
 *   Agent 10 (`worker/index.ts`) yang mendaftarkannya ke queue & cron.
 */

import { logger } from "@/lib/logger";
import { evaluateCondition, listActiveAlertsByCompany, triggerAlert } from "@/lib/alerts";
import { getEvaluationContext } from "@/lib/watchlist/cross-deps";
import { getConfig } from "@/lib/config";
import type { AlertCondition } from "@/lib/types/alerts";

export interface CheckAlertsJobResult {
  processedCompanies: number;
  processedAlerts: number;
  triggered: number;
  skipped: number;
}

async function getCooldownSeconds(): Promise<number> {
  return getConfig<number>("runtime.alerts.cooldown_seconds", { defaultValue: 300 });
}

export async function runCheckAlerts(): Promise<CheckAlertsJobResult> {
  const start = Date.now();
  const cooldownSec = await getCooldownSeconds();
  const grouped = await listActiveAlertsByCompany();

  let processedAlerts = 0;
  let triggered = 0;
  let skipped = 0;

  for (const [companyKode, alertList] of grouped.entries()) {
    const ctx = await getEvaluationContext(companyKode);
    if (!ctx) {
      skipped += alertList.length;
      logger.debug({ companyKode }, "check-alerts: no evaluation context, skip group");
      continue;
    }
    for (const alert of alertList) {
      processedAlerts++;
      if (
        alert.lastTriggeredAt &&
        Date.now() - alert.lastTriggeredAt.getTime() < cooldownSec * 1000
      ) {
        skipped++;
        continue;
      }
      const condition = alert.condition as AlertCondition;
      const result = evaluateCondition(condition, ctx);
      if (!result.triggered) continue;
      await triggerAlert(alert.id, result.snapshot, alert.channels);
      triggered++;
    }
  }

  const elapsedMs = Date.now() - start;
  logger.info(
    { processedCompanies: grouped.size, processedAlerts, triggered, skipped, elapsedMs },
    "check-alerts done",
  );
  return {
    processedCompanies: grouped.size,
    processedAlerts,
    triggered,
    skipped,
  };
}

export const checkAlertsJob = {
  name: "check-alerts",
  handler: runCheckAlerts,
};
