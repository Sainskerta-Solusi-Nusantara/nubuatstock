import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  ownership1pctEmiten,
  ownership1pctHolder,
  type Ownership1pctEmiten,
  type Ownership1pctHolder,
} from "@/db/schema/ownership1pct";
import { logger } from "@/lib/logger";
import { fetchOwnership1pct, type Pct1Emiten } from "./fetch";

export const PCT1_SOURCE_URL = "https://1pct.klinikpenyesalan.com/";

export interface IngestResult {
  emitenCount: number;
  holderCount: number;
  fetchedAt: string;
}

/** Replace seluruh data dengan snapshot baru (idempotent). */
export async function ingestOwnership1pct(
  data: Pct1Emiten[],
  opts: { snapshotDate?: string } = {},
): Promise<IngestResult> {
  const now = new Date();
  const snapshotDate = opts.snapshotDate ?? null;

  const emitenRows = data.map((e) => ({
    kode: e.share_code,
    issuerName: e.issuer_name ?? "",
    sector: e.sector ?? null,
    industry: e.industry ?? null,
    holderCount: e.holderCount ?? e.records?.length ?? 0,
    pctSum: e.pctSum ?? 0,
    freeFloat: e.freeFloat ?? 0,
    cr1: e.cr1 ?? 0,
    cr3: e.cr3 ?? 0,
    hhi: e.hhi ?? 0,
    ccs: e.ccs ?? 0,
    ownershipType: e.ownershipType ?? null,
    hasScripData: e.hasScripData ? 1 : 0,
    snapshotDate,
    fetchedAt: now,
  }));

  const holderRows: (typeof ownership1pctHolder.$inferInsert)[] = [];
  for (const e of data) {
    const recs = e.records ?? [];
    recs.forEach((r, i) => {
      holderRows.push({
        kode: e.share_code,
        investorName: r.investor_name ?? "",
        investorType: r.investor_type || null,
        localForeign: r.local_foreign || null,
        nationality: r.nationality || null,
        domicile: r.domicile || null,
        holdingsScripless: r.holdings_scripless ?? 0,
        holdingsScrip: r.holdings_scrip ?? 0,
        totalShares: r.total_holding_shares ?? 0,
        percentage: r.percentage ?? 0,
        rank: i + 1,
      });
    });
  }

  // Replace all (snapshot terbaru menggantikan).
  await db.delete(ownership1pctHolder);
  await db.delete(ownership1pctEmiten);

  const BATCH = 500;
  for (let i = 0; i < emitenRows.length; i += BATCH) {
    await db.insert(ownership1pctEmiten).values(emitenRows.slice(i, i + BATCH));
  }
  for (let i = 0; i < holderRows.length; i += BATCH) {
    await db.insert(ownership1pctHolder).values(holderRows.slice(i, i + BATCH));
  }

  logger.info({ emiten: emitenRows.length, holders: holderRows.length }, "ownership1pct ingested");
  return { emitenCount: emitenRows.length, holderCount: holderRows.length, fetchedAt: now.toISOString() };
}

/** Fetch dari sumber + ingest. */
export async function refreshOwnership1pct(): Promise<IngestResult> {
  const data = await fetchOwnership1pct();
  return ingestOwnership1pct(data);
}

export interface EmitenListResult {
  total: number;
  rows: Ownership1pctEmiten[];
  fetchedAt: string | null;
}

export async function listEmiten(opts: {
  q?: string;
  sector?: string;
  sort?: "kode" | "freefloat" | "ccs" | "holders";
  page?: number;
  pageSize?: number;
}): Promise<EmitenListResult> {
  const q = (opts.q ?? "").trim().toUpperCase();
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 50));
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * pageSize;

  const conds = [];
  if (q) conds.push(ilike(ownership1pctEmiten.kode, `${q}%`));
  if (opts.sector) conds.push(eq(ownership1pctEmiten.sector, opts.sector));
  const where = conds.length ? and(...conds) : undefined;

  const orderBy =
    opts.sort === "freefloat" ? asc(ownership1pctEmiten.freeFloat)
      : opts.sort === "ccs" ? desc(ownership1pctEmiten.ccs)
        : opts.sort === "holders" ? desc(ownership1pctEmiten.holderCount)
          : asc(ownership1pctEmiten.kode);

  const [countRows, rows, meta] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(ownership1pctEmiten).where(where),
    db.select().from(ownership1pctEmiten).where(where).orderBy(orderBy).limit(pageSize).offset(offset),
    db.select({ f: ownership1pctEmiten.fetchedAt }).from(ownership1pctEmiten).limit(1),
  ]);

  return {
    total: countRows[0]?.n ?? 0,
    rows,
    fetchedAt: meta[0]?.f ? new Date(meta[0].f).toISOString() : null,
  };
}

export async function getEmitenWithHolders(
  kode: string,
): Promise<{ emiten: Ownership1pctEmiten; holders: Ownership1pctHolder[] } | null> {
  const k = kode.trim().toUpperCase();
  const e = await db.select().from(ownership1pctEmiten).where(eq(ownership1pctEmiten.kode, k)).limit(1);
  if (!e[0]) return null;
  const holders = await db
    .select()
    .from(ownership1pctHolder)
    .where(eq(ownership1pctHolder.kode, k))
    .orderBy(asc(ownership1pctHolder.rank));
  return { emiten: e[0], holders };
}

/** Cari per investor: agregasi holding satu nama pemegang saham. */
export async function searchInvestor(name: string, limit = 200): Promise<Ownership1pctHolder[]> {
  const q = name.trim();
  if (q.length < 2) return [];
  return db
    .select()
    .from(ownership1pctHolder)
    .where(ilike(ownership1pctHolder.investorName, `%${q}%`))
    .orderBy(desc(ownership1pctHolder.totalShares))
    .limit(limit);
}

export async function getSectors(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ s: ownership1pctEmiten.sector })
    .from(ownership1pctEmiten)
    .where(sql`${ownership1pctEmiten.sector} is not null and ${ownership1pctEmiten.sector} <> ''`);
  return rows.map((r) => r.s).filter((s): s is string => !!s).sort();
}
