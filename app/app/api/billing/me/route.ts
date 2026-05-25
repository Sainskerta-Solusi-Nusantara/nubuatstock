import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleError, ok } from "@/lib/utils/api";
import {
  getActiveSubscription,
  getAllEntitlements,
  getAllUsage,
  getDailyWindowKey,
  listUserInvoices,
} from "@/lib/billing";
import { getConfig } from "@/lib/config";
import type { CounterKey, UsageSummaryItem } from "@/lib/types/billing";
import { counterKeys, COUNTER_LIMIT_MAP } from "@/lib/types/billing";

/**
 * GET /api/billing/me
 *
 * Auth required. Returns:
 *   - subscription aktif user + tier metadata
 *   - entitlements aktif (snapshot)
 *   - usage summary (semua counter yang relevan untuk tier user)
 *   - disclaimer
 *   - history invoice (limit 10)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const userId = session.user.id;

    const [active, entitlements, usage, invoices, disclaimer] = await Promise.all([
      getActiveSubscription(userId),
      getAllEntitlements(userId),
      getAllUsage(userId),
      listUserInvoices(userId, 10),
      getConfig<string>("app.disclaimer_text"),
    ]);

    const windowKey = getDailyWindowKey();
    const usageList: UsageSummaryItem[] = counterKeys.map((key: CounterKey) => {
      const limitKey = COUNTER_LIMIT_MAP[key];
      const limitRaw = limitKey ? entitlements[limitKey] : null;
      const limit =
        typeof limitRaw === "number" ? limitRaw : typeof limitRaw === "boolean" ? (limitRaw ? Number.MAX_SAFE_INTEGER : 0) : null;
      const used = usage[key] ?? 0;
      const unlimited = limit === null || (typeof limit === "number" && limit >= 999_999);
      return {
        counterKey: key,
        windowKey,
        used,
        limit: unlimited ? null : limit,
        unlimited,
      };
    });

    return ok({
      subscription: active?.subscription ?? null,
      tier: active?.tier ?? null,
      entitlements,
      usage: usageList,
      invoices,
      disclaimer,
    });
  } catch (err) {
    return handleError(err);
  }
}
