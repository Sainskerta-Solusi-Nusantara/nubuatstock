import { and, asc, between, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { corporateActions, dividends, companies } from "@/db/schema/companies";

/**
 * Corporate Action calendar service.
 *
 * Sumber data: tabel `corporate_actions` & `dividends` (Agent 2 schema).
 * Untuk MVP: seed dari Yahoo Finance enrichment (sudah ada `dividend_history`)
 * + manual entry oleh admin di /admin/corporate-actions (future).
 */

export interface CalendarEvent {
  date: string;        // YYYY-MM-DD
  type: "dividend" | "rups" | "split" | "rights" | "ipo" | "delisting";
  companyKode: string;
  companyName: string | null;
  logoUrl: string | null;
  title: string;
  detail?: string;
  amountIdr?: number;
  yieldPct?: number;
}

export async function getCorporateActionCalendar(opts: {
  from: string;        // YYYY-MM-DD
  to: string;
  ticker?: string;
  type?: CalendarEvent["type"];
}): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];

  // 1. Dividends — from dividend_history (Yahoo enrichment) atau dividends table (manual)
  try {
    const divConditions = [
      gte(dividends.exDate, opts.from),
      lte(dividends.exDate, opts.to),
    ];
    if (opts.ticker) divConditions.push(eq(dividends.companyKode, opts.ticker.toUpperCase()));

    const divRows = await db
      .select({
        date: dividends.exDate,
        ticker: dividends.companyKode,
        name: companies.namaPerusahaan,
        logo: companies.logoUrl,
        amount: dividends.dividendPerShareIdr,
        period: dividends.period,
      })
      .from(dividends)
      .leftJoin(companies, eq(companies.kode, dividends.companyKode))
      .where(and(...divConditions))
      .orderBy(asc(dividends.exDate))
      .limit(500);

    for (const r of divRows) {
      if (!r.date) continue;
      const dateStr =
        (r.date as unknown) instanceof Date
          ? (r.date as unknown as Date).toISOString().slice(0, 10)
          : String(r.date);
      events.push({
        date: dateStr,
        type: "dividend",
        companyKode: r.ticker,
        companyName: r.name ?? null,
        logoUrl: r.logo ?? null,
        title: `Cum dividen ${r.ticker}`,
        detail: r.period ? `Periode ${r.period}` : undefined,
        amountIdr: r.amount != null ? Number(r.amount) : undefined,
      });
    }
  } catch {
    // Tabel mungkin belum populated
  }

  // 2. Corporate actions (split, rights, M&A, dll)
  try {
    const caConditions = [
      gte(corporateActions.exDate, opts.from),
      lte(corporateActions.exDate, opts.to),
    ];
    if (opts.ticker) caConditions.push(eq(corporateActions.companyKode, opts.ticker.toUpperCase()));

    const caRows = await db
      .select({
        date: corporateActions.exDate,
        ticker: corporateActions.companyKode,
        name: companies.namaPerusahaan,
        logo: companies.logoUrl,
        actionType: corporateActions.actionType,
        description: corporateActions.description,
        ratio: corporateActions.ratio,
      })
      .from(corporateActions)
      .leftJoin(companies, eq(companies.kode, corporateActions.companyKode))
      .where(and(...caConditions))
      .orderBy(asc(corporateActions.exDate))
      .limit(500);

    const typeMap: Record<string, CalendarEvent["type"]> = {
      stock_split: "split",
      reverse_split: "split",
      rights_issue: "rights",
      bonus_issue: "rights",
    };

    for (const r of caRows) {
      if (!r.date) continue;
      const dateStr =
        (r.date as unknown) instanceof Date
          ? (r.date as unknown as Date).toISOString().slice(0, 10)
          : String(r.date);
      const mappedType = typeMap[r.actionType] ?? "split";
      if (opts.type && opts.type !== mappedType) continue;
      events.push({
        date: dateStr,
        type: mappedType,
        companyKode: r.ticker,
        companyName: r.name ?? null,
        logoUrl: r.logo ?? null,
        title: actionTypeLabel(r.actionType, r.ratio),
        detail: r.description ?? undefined,
      });
    }
  } catch {
    // ignore
  }

  // Filter by type kalau ada
  const filtered = opts.type ? events.filter((e) => e.type === opts.type) : events;
  // Sort by date ascending
  filtered.sort((a, b) => a.date.localeCompare(b.date));
  return filtered;
}

function actionTypeLabel(type: string, ratio: unknown): string {
  const labels: Record<string, string> = {
    stock_split: "Stock Split",
    reverse_split: "Reverse Split",
    rights_issue: "Rights Issue",
    bonus_issue: "Bonus Issue",
    merger: "Merger",
    spinoff: "Spinoff",
    name_change: "Ganti Nama",
    delisting: "Delisting",
    relisting: "Relisting",
  };
  const base = labels[type] ?? type;
  return ratio ? `${base} ${ratio}` : base;
}

export function groupByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const out = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const arr = out.get(e.date) ?? [];
    arr.push(e);
    out.set(e.date, arr);
  }
  return out;
}
