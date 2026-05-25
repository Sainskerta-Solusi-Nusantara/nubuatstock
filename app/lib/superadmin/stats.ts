import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Aggregation helpers untuk superadmin stats dashboard.
 *
 * Semua query SQL parameterized (Drizzle sql template) — aman dari injection.
 * Time-window pakai date_trunc untuk konsistensi.
 *
 * Catatan: query refer ke tabel yang dimiliki agent lain:
 *   - users (Agent 3)
 *   - user_subscriptions, invoices, payments (Agent 4)
 *   - ai_messages, ai_usage_log (Agent 7)
 *   - daily_picks (Agent 8)
 *   - audit_log (Agent 11)
 * Kalau tabel belum ada di DB → query throws; halaman akan tampilkan empty state.
 */

export interface GrowthSnapshot {
  totalUsers: number;
  signupsToday: number;
  signupsLast7d: number;
  signupsLast30d: number;
  growthRate7d: number; // percent vs previous 7d
  activeToday: number;
  activeLast7d: number;
  activeLast30d: number;
}

export interface RevenueSnapshot {
  mrrIdr: number;
  arrIdr: number;
  payingUsers: number;
  trialingUsers: number;
  freeUsers: number;
  invoicesPaidMtd: number;
  invoicesPaidMtdAmount: number;
  newMrrLast30d: number;
  churnedMrrLast30d: number;
}

export interface TierBreakdown {
  tierKode: string;
  userCount: number;
  mrrContribution: number;
}

export interface DailyGrowthPoint {
  date: string;        // YYYY-MM-DD
  signups: number;
  activated: number;   // users with at least 1 action today
}

export interface DailyRevenuePoint {
  date: string;
  newMrr: number;
  churnedMrr: number;
  netMrrDelta: number;
}

export interface SystemHealth {
  aiCostBurnLast24hIdr: number;     // estimate
  aiQueriesLast24h: number;
  picksGeneratedLast7d: number;
  alertsTriggeredLast24h: number;
  failedSignupsLast24h: number;
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function getGrowthSnapshot(): Promise<GrowthSnapshot> {
  return safeQuery(async () => {
    const rows = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_users,
        COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE AND deleted_at IS NULL) AS signups_today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days' AND deleted_at IS NULL) AS signups_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' AND deleted_at IS NULL) AS signups_prev_7d,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) AS signups_30d,
        COUNT(*) FILTER (WHERE last_login_at::date = CURRENT_DATE) AS active_today,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '7 days') AS active_7d,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '30 days') AS active_30d
      FROM users
    `);
    const r = (rows as unknown as Array<Record<string, unknown>>)[0] ?? {};
    const num = (v: unknown) => Number(v ?? 0);
    const signups7d = num(r.signups_7d);
    const signupsPrev7d = num(r.signups_prev_7d);
    const growthRate7d = signupsPrev7d > 0 ? ((signups7d - signupsPrev7d) / signupsPrev7d) * 100 : 0;
    return {
      totalUsers: num(r.total_users),
      signupsToday: num(r.signups_today),
      signupsLast7d: signups7d,
      signupsLast30d: num(r.signups_30d),
      growthRate7d,
      activeToday: num(r.active_today),
      activeLast7d: num(r.active_7d),
      activeLast30d: num(r.active_30d),
    };
  }, {
    totalUsers: 0, signupsToday: 0, signupsLast7d: 0, signupsLast30d: 0,
    growthRate7d: 0, activeToday: 0, activeLast7d: 0, activeLast30d: 0,
  });
}

export async function getRevenueSnapshot(): Promise<RevenueSnapshot> {
  return safeQuery(async () => {
    const tierRows = await db.execute(sql`
      SELECT us.tier_kode, st.price_monthly_idr, COUNT(*)::int AS user_count
      FROM user_subscriptions us
      JOIN subscription_tiers st ON st.kode = us.tier_kode
      WHERE us.status IN ('active', 'trialing')
      GROUP BY us.tier_kode, st.price_monthly_idr
    `);
    let mrr = 0;
    let paying = 0;
    let trialing = 0;
    let free = 0;
    for (const r of tierRows as unknown as Array<Record<string, unknown>>) {
      const count = Number(r.user_count ?? 0);
      const price = Number(r.price_monthly_idr ?? 0);
      const tier = String(r.tier_kode ?? "");
      if (tier === "free") free += count;
      else if (price === 0) trialing += count;
      else {
        paying += count;
        mrr += count * price;
      }
    }

    const invoicesRow = await db.execute(sql`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(amount_idr), 0) AS total
      FROM invoices
      WHERE status = 'paid' AND paid_at >= date_trunc('month', NOW())
    `);
    const inv = (invoicesRow as unknown as Array<Record<string, unknown>>)[0] ?? {};

    const newMrrRow = await db.execute(sql`
      SELECT COALESCE(SUM(st.price_monthly_idr), 0) AS new_mrr
      FROM user_subscriptions us
      JOIN subscription_tiers st ON st.kode = us.tier_kode
      WHERE us.status = 'active' AND us.started_at >= NOW() - INTERVAL '30 days' AND st.price_monthly_idr > 0
    `);
    const nm = (newMrrRow as unknown as Array<Record<string, unknown>>)[0] ?? {};

    const churnedRow = await db.execute(sql`
      SELECT COALESCE(SUM(st.price_monthly_idr), 0) AS churned_mrr
      FROM user_subscriptions us
      JOIN subscription_tiers st ON st.kode = us.tier_kode
      WHERE us.status IN ('cancelled', 'expired')
        AND us.current_period_end >= NOW() - INTERVAL '30 days'
        AND st.price_monthly_idr > 0
    `);
    const ch = (churnedRow as unknown as Array<Record<string, unknown>>)[0] ?? {};

    return {
      mrrIdr: mrr,
      arrIdr: mrr * 12,
      payingUsers: paying,
      trialingUsers: trialing,
      freeUsers: free,
      invoicesPaidMtd: Number(inv.cnt ?? 0),
      invoicesPaidMtdAmount: Number(inv.total ?? 0),
      newMrrLast30d: Number(nm.new_mrr ?? 0),
      churnedMrrLast30d: Number(ch.churned_mrr ?? 0),
    };
  }, {
    mrrIdr: 0, arrIdr: 0, payingUsers: 0, trialingUsers: 0, freeUsers: 0,
    invoicesPaidMtd: 0, invoicesPaidMtdAmount: 0, newMrrLast30d: 0, churnedMrrLast30d: 0,
  });
}

export async function getTierBreakdown(): Promise<TierBreakdown[]> {
  return safeQuery(async () => {
    const rows = await db.execute(sql`
      SELECT us.tier_kode, st.price_monthly_idr, COUNT(*)::int AS user_count
      FROM user_subscriptions us
      JOIN subscription_tiers st ON st.kode = us.tier_kode
      WHERE us.status IN ('active', 'trialing')
      GROUP BY us.tier_kode, st.price_monthly_idr
      ORDER BY st.price_monthly_idr DESC NULLS LAST
    `);
    return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
      tierKode: String(r.tier_kode ?? ""),
      userCount: Number(r.user_count ?? 0),
      mrrContribution: Number(r.user_count ?? 0) * Number(r.price_monthly_idr ?? 0),
    }));
  }, []);
}

export async function getDailyGrowth(days = 30): Promise<DailyGrowthPoint[]> {
  return safeQuery(async () => {
    const rows = await db.execute(sql`
      WITH series AS (
        SELECT generate_series(
          (CURRENT_DATE - (${days}::int - 1)),
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS d
      )
      SELECT
        s.d::text AS date,
        COALESCE(u.signups, 0)::int AS signups,
        COALESCE(a.activated, 0)::int AS activated
      FROM series s
      LEFT JOIN (
        SELECT created_at::date AS d, COUNT(*) AS signups
        FROM users
        WHERE created_at >= CURRENT_DATE - (${days}::int - 1)
        GROUP BY 1
      ) u ON u.d = s.d
      LEFT JOIN (
        SELECT last_login_at::date AS d, COUNT(DISTINCT id) AS activated
        FROM users
        WHERE last_login_at >= CURRENT_DATE - (${days}::int - 1)
        GROUP BY 1
      ) a ON a.d = s.d
      ORDER BY s.d
    `);
    return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
      date: String(r.date),
      signups: Number(r.signups),
      activated: Number(r.activated),
    }));
  }, []);
}

export async function getSystemHealth(): Promise<SystemHealth> {
  return safeQuery(async () => {
    const ai = await db.execute(sql`
      SELECT COALESCE(SUM(requests_count), 0)::int AS req, COALESCE(SUM(cost_estimate_idr), 0)::numeric AS cost
      FROM ai_usage_log
      WHERE date >= CURRENT_DATE - INTERVAL '1 day'
    `).catch(() => [] as Array<Record<string, unknown>>);
    const picks = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM daily_picks WHERE published_at >= NOW() - INTERVAL '7 days'
    `).catch(() => [] as Array<Record<string, unknown>>);
    const alerts = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM alert_triggers WHERE triggered_at >= NOW() - INTERVAL '1 day'
    `).catch(() => [] as Array<Record<string, unknown>>);
    const fail = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM auth_audit_log
      WHERE action = 'login_failed' AND created_at >= NOW() - INTERVAL '1 day'
    `).catch(() => [] as Array<Record<string, unknown>>);

    const a = (ai as Array<Record<string, unknown>>)[0] ?? {};
    const p = (picks as Array<Record<string, unknown>>)[0] ?? {};
    const al = (alerts as Array<Record<string, unknown>>)[0] ?? {};
    const f = (fail as Array<Record<string, unknown>>)[0] ?? {};

    return {
      aiCostBurnLast24hIdr: Number(a.cost ?? 0),
      aiQueriesLast24h: Number(a.req ?? 0),
      picksGeneratedLast7d: Number(p.cnt ?? 0),
      alertsTriggeredLast24h: Number(al.cnt ?? 0),
      failedSignupsLast24h: Number(f.cnt ?? 0),
    };
  }, {
    aiCostBurnLast24hIdr: 0, aiQueriesLast24h: 0, picksGeneratedLast7d: 0,
    alertsTriggeredLast24h: 0, failedSignupsLast24h: 0,
  });
}

export function formatIdr(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
