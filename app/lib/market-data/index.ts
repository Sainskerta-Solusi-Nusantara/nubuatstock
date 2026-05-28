import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import {
  TRGM_KODE_THRESHOLD,
  TRGM_NAME_THRESHOLD,
  escapeLikePattern,
  looksLikeTicker,
  normalizeSearchQuery,
} from "@/lib/companies/search-query";
import {
  brokerSummaryDaily,
  foreignFlowDaily,
  foreignFlowIntraday,
  quotesEod,
} from "@/db/schema/market";
import { ConfigurationError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { TierKode } from "@/lib/types/billing";
import type {
  BrokerSummaryRow,
  ForeignFlowDailyRow,
  ForeignFlowGranularity,
  ForeignFlowIntradayRow,
  IntradayGranularity,
  OhlcvBar,
  OhlcvInterval,
  Quote,
  TickerSearchResult,
} from "@/lib/types/market";
import { AdapterNotConfiguredError, VendorError } from "./adapters/base";
import { getActiveAdapter } from "./adapters/factory";
import { cacheGet, cacheSet } from "./cache";
import { dateToIso, parseIsoDate } from "./range";

/**
 * Service layer: orchestration cache → DB → adapter.
 *
 * Konvensi error:
 *   - Vendor down / not configured → throw ConfigurationError (503 di API).
 *   - Ticker tidak ada di companies → throw NotFoundError (404).
 *   - Tier-gated logic dilakukan di API handler, BUKAN di service (separation).
 */

const QUOTE_CACHE_TTL_SEC = 30;

function toConfigError(err: unknown, vendor: string, op: string): never {
  if (err instanceof AdapterNotConfiguredError) {
    throw new ConfigurationError(`market_data.${err.vendor} (${err.setting})`);
  }
  if (err instanceof VendorError) {
    logger.error({ err, vendor, op }, "Vendor error");
    throw new ConfigurationError(
      `market_data.${vendor} unreachable for ${op}: ${err.message}`,
    );
  }
  throw err;
}

async function ensureCompanyExists(code: string): Promise<void> {
  const rows = await db
    .select({ kode: companies.kode })
    .from(companies)
    .where(eq(companies.kode, code))
    .limit(1);
  if (rows.length === 0) {
    throw new NotFoundError(`Ticker ${code}`);
  }
}

// ============================== Quotes ==============================

export async function getQuote(code: string): Promise<Quote> {
  const upper = code.toUpperCase();
  await ensureCompanyExists(upper);

  const cacheKey = `quote:${upper}`;
  const cached = await cacheGet<Quote>(cacheKey);
  if (cached) return cached;

  const adapter = await getActiveAdapter();
  let quote: Quote;
  try {
    quote = await adapter.fetchQuote(upper);
  } catch (err) {
    return toConfigError(err, adapter.name, "quote");
  }

  // Cache (Redis 30s).
  await cacheSet(cacheKey, quote, QUOTE_CACHE_TTL_SEC);

  // Best-effort upsert latest EoD jika market sudah close & ada open/high/low/close.
  if (
    quote.open &&
    quote.high &&
    quote.low &&
    quote.price &&
    (quote.marketState === "CLOSED" || quote.marketState === "POST")
  ) {
    const today = dateToIso(new Date());
    await db
      .insert(quotesEod)
      .values({
        tradeDate: today,
        companyKode: upper,
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.price,
        volume: BigInt(quote.volume ?? "0"),
        valueIdr: quote.valueIdr ?? "0",
        prevClose: quote.prevClose ?? null,
      })
      .onConflictDoUpdate({
        target: [quotesEod.companyKode, quotesEod.tradeDate],
        set: {
          open: quote.open,
          high: quote.high,
          low: quote.low,
          close: quote.price,
          volume: BigInt(quote.volume ?? "0"),
          valueIdr: quote.valueIdr ?? "0",
          prevClose: quote.prevClose ?? null,
          updatedAt: new Date(),
        },
      })
      .catch((err) => {
        logger.warn({ err, code: upper }, "Quote → EoD upsert best-effort failed");
      });
  }

  return quote;
}

// ============================== OHLCV ==============================

interface GetOhlcvOpts {
  from: Date;
  to: Date;
  interval: OhlcvInterval;
}

export async function getOhlcv(code: string, opts: GetOhlcvOpts): Promise<OhlcvBar[]> {
  const upper = code.toUpperCase();
  await ensureCompanyExists(upper);

  const fromIso = dateToIso(opts.from);
  const toIso = dateToIso(opts.to);

  // DB first (untuk 1d). 1wk/1mo aggregate via SQL.
  if (opts.interval === "1d") {
    const dbBars = await db
      .select()
      .from(quotesEod)
      .where(
        and(
          eq(quotesEod.companyKode, upper),
          gte(quotesEod.tradeDate, fromIso),
          lte(quotesEod.tradeDate, toIso),
        ),
      )
      .orderBy(asc(quotesEod.tradeDate));

    const expectedDays = Math.max(1, Math.floor((opts.to.getTime() - opts.from.getTime()) / 86_400_000));
    // Anggap weekday ~ 70% kalender. Kalau coverage < 50%, anggap data gap & backfill.
    const coverageRatio = dbBars.length / (expectedDays * 0.7);

    if (coverageRatio >= 0.9) {
      return dbBars.map(
        (b): OhlcvBar => ({
          date: b.tradeDate,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          volume: b.volume.toString(),
          valueIdr: b.valueIdr,
          vwap: b.vwap ?? undefined,
        }),
      );
    }
    // else: fall through ke adapter & backfill.
  }

  const adapter = await getActiveAdapter();
  let bars: OhlcvBar[];
  try {
    bars = await adapter.fetchOhlcv(upper, opts.from, opts.to, opts.interval);
  } catch (err) {
    // Kalau adapter gagal tapi kita punya partial DB data untuk 1d, return apa adanya.
    if (opts.interval === "1d") {
      const partial = await db
        .select()
        .from(quotesEod)
        .where(
          and(
            eq(quotesEod.companyKode, upper),
            gte(quotesEod.tradeDate, fromIso),
            lte(quotesEod.tradeDate, toIso),
          ),
        )
        .orderBy(asc(quotesEod.tradeDate));
      if (partial.length > 0) {
        logger.warn(
          { code: upper, count: partial.length },
          "Adapter failed; returning partial DB OHLCV",
        );
        return partial.map(
          (b): OhlcvBar => ({
            date: b.tradeDate,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            volume: b.volume.toString(),
            valueIdr: b.valueIdr,
            vwap: b.vwap ?? undefined,
          }),
        );
      }
    }
    return toConfigError(err, adapter.name, "ohlcv");
  }

  // Backfill DB untuk 1d bars (1wk/1mo skip — derive on read).
  if (opts.interval === "1d" && bars.length > 0) {
    await backfillEod(upper, bars);
  }

  return bars;
}

async function backfillEod(code: string, bars: OhlcvBar[]): Promise<void> {
  const values = bars.map((b) => ({
    tradeDate: b.date,
    companyKode: code,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: BigInt(b.volume || "0"),
    valueIdr: b.valueIdr ?? "0",
  }));
  if (values.length === 0) return;

  // Batch insert ON CONFLICT DO NOTHING — preserve manually-curated data.
  try {
    await db.insert(quotesEod).values(values).onConflictDoNothing({
      target: [quotesEod.companyKode, quotesEod.tradeDate],
    });
  } catch (err) {
    logger.warn({ err, code, count: values.length }, "Backfill EoD failed (non-fatal)");
  }
}

// ============================== Search ==============================

export async function searchTickers(query: string, limit = 20): Promise<TickerSearchResult[]> {
  // Normalisasi: trim + collapse whitespace (pure, lib/companies/search-query).
  const q = normalizeSearchQuery(query);
  if (q.length === 0) return [];

  const upperQ = q.toUpperCase();
  const escaped = escapeLikePattern(q);
  const escapedUpper = escapeLikePattern(upperQ);
  const isTicker = looksLikeTicker(q);

  // Match conditions:
  //  - exact / prefix / contains pada kode (cepat, presisi)
  //  - contains pada nama (ILIKE)
  //  - trigram similarity fallback (typo tolerance): `kode % q`, `nama % q`,
  //    di-gate threshold via similarity(...). Index GIN trgm (migration 0001).
  const matchExpr = or(
    ilike(companies.kode, `${escapedUpper}%`),
    ilike(companies.kode, `%${escapedUpper}%`),
    ilike(companies.namaPerusahaan, `%${escaped}%`),
    sql`similarity(${companies.kode}, ${upperQ}) >= ${isTicker ? TRGM_KODE_THRESHOLD : TRGM_NAME_THRESHOLD}`,
    sql`similarity(${companies.namaPerusahaan}, ${q}) >= ${TRGM_NAME_THRESHOLD}`,
  );

  // Ordering: exact kode → prefix kode → sisanya by best trigram similarity DESC
  // (typo terdekat naik), tie-break alfabetis kode.
  const rankExpr = sql<number>`
    CASE
      WHEN ${companies.kode} = ${upperQ} THEN 0
      WHEN ${companies.kode} LIKE ${`${escapedUpper}%`} THEN 1
      ELSE 2
    END
  `;
  const simExpr = sql<number>`
    GREATEST(
      similarity(${companies.kode}, ${upperQ}),
      similarity(${companies.namaPerusahaan}, ${q})
    )
  `;

  const dbRows = await db
    .select({
      kode: companies.kode,
      nama: companies.namaPerusahaan,
    })
    .from(companies)
    .where(and(eq(companies.isActive, true), matchExpr))
    .orderBy(rankExpr, desc(simExpr), asc(companies.kode))
    .limit(limit);

  const fromDb: TickerSearchResult[] = dbRows.map((r) => ({
    code: r.kode,
    name: r.nama,
    exchange: "JKT",
    type: "EQUITY",
  }));

  if (fromDb.length >= limit) return fromDb;

  // Augment dengan adapter (kalau support).
  try {
    const adapter = await getActiveAdapter();
    if (!adapter.fetchSearch) return fromDb;
    const remote = await adapter.fetchSearch(q);
    const seen = new Set(fromDb.map((r) => r.code));
    for (const r of remote) {
      if (seen.has(r.code)) continue;
      fromDb.push(r);
      if (fromDb.length >= limit) break;
    }
  } catch (err) {
    logger.warn({ err, q }, "Adapter search failed; returning DB-only results");
  }
  return fromDb;
}

// ============================== Broker Summary ==============================

interface GetBrokerSummaryOpts {
  fromDate: string;
  toDate: string;
  side?: "buy" | "sell" | "both";
  limit?: number;
}

export async function getBrokerSummary(
  code: string,
  opts: GetBrokerSummaryOpts,
): Promise<BrokerSummaryRow[]> {
  const upper = code.toUpperCase();
  await ensureCompanyExists(upper);
  parseIsoDate(opts.fromDate);
  parseIsoDate(opts.toDate);

  const filters = [
    eq(brokerSummaryDaily.companyKode, upper),
    gte(brokerSummaryDaily.tradeDate, opts.fromDate),
    lte(brokerSummaryDaily.tradeDate, opts.toDate),
  ];
  if (opts.side) {
    filters.push(eq(brokerSummaryDaily.side, opts.side));
  }

  const rows = await db
    .select()
    .from(brokerSummaryDaily)
    .where(and(...filters))
    .orderBy(desc(brokerSummaryDaily.tradeDate), desc(brokerSummaryDaily.valueIdr))
    .limit(opts.limit ?? 50);

  return rows.map(
    (r): BrokerSummaryRow => ({
      tradeDate: r.tradeDate,
      brokerCode: r.brokerCode,
      brokerName: r.brokerName,
      side: r.side as BrokerSummaryRow["side"],
      volume: r.volume.toString(),
      valueIdr: r.valueIdr,
      avgPrice: r.avgPrice,
      netValueIdr: r.netValueIdr,
    }),
  );
}

// ============================== Foreign Flow ==============================

interface GetForeignFlowDailyOpts {
  fromDate: string;
  toDate: string;
}

export async function getForeignFlowDaily(
  code: string,
  opts: GetForeignFlowDailyOpts,
): Promise<ForeignFlowDailyRow[]> {
  const upper = code.toUpperCase();
  await ensureCompanyExists(upper);
  parseIsoDate(opts.fromDate);
  parseIsoDate(opts.toDate);

  const rows = await db
    .select()
    .from(foreignFlowDaily)
    .where(
      and(
        eq(foreignFlowDaily.companyKode, upper),
        gte(foreignFlowDaily.tradeDate, opts.fromDate),
        lte(foreignFlowDaily.tradeDate, opts.toDate),
      ),
    )
    .orderBy(asc(foreignFlowDaily.tradeDate));

  return rows.map(
    (r): ForeignFlowDailyRow => ({
      tradeDate: r.tradeDate,
      foreignBuyValue: r.foreignBuyValue,
      foreignSellValue: r.foreignSellValue,
      netValue: r.netValue,
      foreignBuyVolume: r.foreignBuyVolume.toString(),
      foreignSellVolume: r.foreignSellVolume.toString(),
    }),
  );
}

interface GetForeignFlowIntradayOpts {
  granularity: IntradayGranularity;
  fromTs?: Date;
  toTs?: Date;
}

export async function getForeignFlowIntraday(
  code: string,
  opts: GetForeignFlowIntradayOpts,
): Promise<ForeignFlowIntradayRow[]> {
  const upper = code.toUpperCase();
  await ensureCompanyExists(upper);

  const conditions = [
    eq(foreignFlowIntraday.companyKode, upper),
    eq(foreignFlowIntraday.granularity, opts.granularity),
  ];
  if (opts.fromTs) conditions.push(gte(foreignFlowIntraday.ts, opts.fromTs));
  if (opts.toTs) conditions.push(lte(foreignFlowIntraday.ts, opts.toTs));

  const rows = await db
    .select()
    .from(foreignFlowIntraday)
    .where(and(...conditions))
    .orderBy(asc(foreignFlowIntraday.ts));

  return rows.map(
    (r): ForeignFlowIntradayRow => ({
      ts: r.ts.toISOString(),
      granularity: r.granularity as IntradayGranularity,
      foreignBuyValue: r.foreignBuyValue,
      foreignSellValue: r.foreignSellValue,
      netValue: r.netValue,
    }),
  );
}

// ============================== Granularity → tier mapping ==============================

/**
 * Tier minimum untuk akses granularity tertentu.
 *
 * Catatan: nama tier menyesuaikan Agent 4 (lihat `subscription_tiers`); tier
 * key tetap di sini supaya Service tetap pure & API handler tinggal call
 * `requireTier(session, minTierForGranularity(g))`.
 */
export function minTierForForeignFlowGranularity(g: ForeignFlowGranularity): TierKode {
  switch (g) {
    case "1d":
      return "free";
    case "1h":
      return "starter";
    case "15m":
      return "pro";
    case "5m":
      return "pro";
  }
}

export function isIntradayGranularity(g: ForeignFlowGranularity): g is IntradayGranularity {
  return g !== "1d";
}

