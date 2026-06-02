import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  ownership1pctChangelog,
  ownership1pctEmiten,
  ownership1pctHolder,
  type Ownership1pctChangelog,
  type Ownership1pctEmiten,
  type Ownership1pctHolder,
} from "@/db/schema/ownership1pct";
import type { KseiBreakdown } from "@/db/schema/ksei";
import { logger } from "@/lib/logger";
import { fetchOwnership1pctAll, type ChangelogData, type Pct1Emiten } from "./fetch";

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

/** Simpan changelog (data perubahan) RAW — idempotent per currentDate. */
export async function storeChangelog(cl: ChangelogData | null): Promise<boolean> {
  if (!cl?.currentDate) return false;
  const now = new Date();
  await db
    .insert(ownership1pctChangelog)
    .values({
      currentDate: cl.currentDate,
      prevDate: (cl.prevDate as string | undefined) ?? null,
      raw: cl,
      fetchedAt: now,
    })
    .onConflictDoUpdate({
      target: ownership1pctChangelog.currentDate,
      set: { prevDate: (cl.prevDate as string | undefined) ?? null, raw: cl, fetchedAt: now, updatedAt: now },
    });
  logger.info({ currentDate: cl.currentDate }, "ownership1pct changelog stored");
  return true;
}

/** Fetch dari sumber + ingest emiten + simpan changelog. */
export async function refreshOwnership1pct(): Promise<IngestResult & { changelog: boolean }> {
  const { emiten, changelog } = await fetchOwnership1pctAll();
  const result = await ingestOwnership1pct(emiten);
  const stored = await storeChangelog(changelog);
  return { ...result, changelog: stored };
}

/** Ambil changelog terbaru (atau per tanggal). */
export async function getLatestChangelog(): Promise<Ownership1pctChangelog | null> {
  const rows = await db
    .select()
    .from(ownership1pctChangelog)
    .orderBy(desc(ownership1pctChangelog.currentDate))
    .limit(1);
  return rows[0] ?? null;
}

/* ---- Bentuk RAW changelog (hasil inspeksi data prod) ---- */
export interface ChangelogInvestor {
  investor_name: string;
  investor_type: string;
  local_foreign: string; // "D" | "F"
  shares: number;
  percentage: number;
  holdings_scrip?: number;
  holdings_scripless?: number;
  prev_shares?: number;
  prev_percentage?: number;
}
export interface ChangelogNewStock {
  share_code: string;
  issuer_name: string;
  investors: ChangelogInvestor[];
}
export interface ChangelogStockChange {
  share_code: string;
  issuer_name: string;
  new_investors: ChangelogInvestor[];
  removed_investors: ChangelogInvestor[];
  share_changes: ChangelogInvestor[];
}
export interface SummaryGainerLoser {
  share_code: string;
  issuer_name: string;
  investor_name: string;
  shares: number;
  prev_shares: number;
  share_diff: number;
  pct_diff: number;
}
export interface SummaryStockFlow {
  share_code: string;
  issuer_name: string;
  net_share_change: number;
  net_pct_change: number;
}
export interface SummaryHolder {
  investor_name: string;
  total_shares: number;
}
export interface ChangelogRaw {
  currentDate: string;
  prevDate?: string;
  changelog?: {
    changes?: ChangelogStockChange[];
    new_stocks?: ChangelogNewStock[];
    removed_stocks?: ChangelogNewStock[];
  };
  summary?: {
    topGainers?: SummaryGainerLoser[];
    topLosers?: SummaryGainerLoser[];
    topHolders?: SummaryHolder[];
    topBoughtStocks?: SummaryStockFlow[];
    topSoldStocks?: SummaryStockFlow[];
  };
  newInvestorNames?: string[];
}

export interface ChangelogResult {
  currentDate: string;
  prevDate: string | null;
  fetchedAt: string | null;
  raw: ChangelogRaw;
}

/** Ambil changelog terbaru sebagai bentuk rapi untuk dipakai client. */
export async function getChangelogForClient(): Promise<ChangelogResult | null> {
  const row = await getLatestChangelog();
  if (!row) return null;
  return {
    currentDate: row.currentDate,
    prevDate: row.prevDate ?? null,
    fetchedAt: row.fetchedAt ? new Date(row.fetchedAt).toISOString() : null,
    raw: row.raw as ChangelogRaw,
  };
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

// ---- Dashboard ala klinikpenyesalan (semua data ke client) ----

export interface DashHolder {
  name: string;
  type: string;
  lf: string; // D / F
  domicile: string;
  shares: number;
  scrip: number;
  pct: number;
  value: number; // shares * price KSEI
}
/** Komposisi 9-tipe investor KSEI (sumber: BalancePos), % dari total saham. */
export interface KseiCompType {
  key: string; // ID/CP/MF/IB/IS/PF/SC/FD/OT
  label: string;
  shares: number; // lokal + asing
  localShares: number;
  foreignShares: number;
  pct: number; // % dari total komposisi
}
export interface KseiComp {
  total: number; // total saham (lokal+asing) di komposisi KSEI
  localPct: number;
  foreignPct: number;
  types: KseiCompType[]; // urut % desc
}
export interface DashEmiten {
  kode: string;
  name: string;
  sector: string;
  holderCount: number;
  freeFloat: number;
  ccs: number;
  ownershipType: string;
  price: number;
  marketCap: number;
  holders: DashHolder[];
  ksei: KseiComp | null; // komposisi 9-tipe KSEI (Klasifikasi)
}
export interface DashData {
  emiten: DashEmiten[];
  sectors: string[];
  snapshotDate: string | null;
  fetchedAt: string | null;
}

/** Rakit seluruh data untuk dashboard review (digabung harga dari KSEI). */
export async function getKlinikDashboardData(): Promise<DashData> {
  const { kseiOwnership } = await import("@/db/schema/ksei");
  const { getLatestPosDate } = await import("@/lib/ksei/service");
  const { KSEI_TYPE_LABELS } = await import("@/lib/ksei/parse");
  const latestKsei = await getLatestPosDate();

  const [emitenRows, holderRows, priceRows] = await Promise.all([
    db.select().from(ownership1pctEmiten),
    db.select().from(ownership1pctHolder).orderBy(asc(ownership1pctHolder.rank)),
    latestKsei
      ? db.select({
          kode: kseiOwnership.kode, price: kseiOwnership.priceIdr, secNum: kseiOwnership.secNum,
          local: kseiOwnership.local, foreign: kseiOwnership.foreign,
          localTotal: kseiOwnership.localTotal, foreignTotal: kseiOwnership.foreignTotal,
        }).from(kseiOwnership).where(eq(kseiOwnership.posDate, latestKsei))
      : Promise.resolve([] as {
          kode: string; price: number; secNum: number;
          local: KseiBreakdown; foreign: KseiBreakdown; localTotal: number; foreignTotal: number;
        }[]),
  ]);

  // Urutan tampil tipe KSEI (key) — KSEI_TYPE_LABELS sudah punya label ID.
  const TYPE_KEYS = Object.keys(KSEI_TYPE_LABELS) as (keyof typeof KSEI_TYPE_LABELS)[];
  const buildComp = (r: { local: KseiBreakdown; foreign: KseiBreakdown; localTotal: number; foreignTotal: number }): KseiComp | null => {
    const total = (r.localTotal ?? 0) + (r.foreignTotal ?? 0);
    if (total <= 0) return null;
    const types: KseiCompType[] = TYPE_KEYS.map((k) => {
      const localShares = r.local?.[k] ?? 0;
      const foreignShares = r.foreign?.[k] ?? 0;
      const shares = localShares + foreignShares;
      return { key: k, label: KSEI_TYPE_LABELS[k], shares, localShares, foreignShares, pct: (shares / total) * 100 };
    }).filter((t) => t.shares > 0).sort((a, b) => b.pct - a.pct);
    return {
      total,
      localPct: (r.localTotal / total) * 100,
      foreignPct: (r.foreignTotal / total) * 100,
      types,
    };
  };

  const priceMap = new Map(priceRows.map((p) => [p.kode, p]));
  const holdersByKode = new Map<string, DashHolder[]>();
  for (const h of holderRows) {
    const price = priceMap.get(h.kode)?.price ?? 0;
    const arr = holdersByKode.get(h.kode) ?? [];
    arr.push({
      name: h.investorName,
      type: h.investorType || "",
      lf: h.localForeign || "D",
      domicile: h.domicile || "",
      shares: h.totalShares,
      scrip: h.holdingsScrip,
      pct: h.percentage,
      value: h.totalShares * price,
    });
    holdersByKode.set(h.kode, arr);
  }

  const emiten: DashEmiten[] = emitenRows.map((e) => {
    const p = priceMap.get(e.kode);
    const price = p?.price ?? 0;
    const secNum = p?.secNum ?? 0;
    return {
      kode: e.kode,
      name: e.issuerName,
      sector: e.sector ?? "",
      holderCount: e.holderCount,
      freeFloat: e.freeFloat,
      ccs: Math.round(e.ccs),
      ownershipType: e.ownershipType ?? "",
      price,
      marketCap: price * secNum,
      holders: holdersByKode.get(e.kode) ?? [],
      ksei: p ? buildComp(p) : null,
    };
  }).sort((a, b) => a.kode.localeCompare(b.kode));

  const sectors = [...new Set(emiten.map((e) => e.sector).filter(Boolean))].sort();
  const fetchedAt = emitenRows[0]?.fetchedAt ? new Date(emitenRows[0].fetchedAt).toISOString() : null;
  const snapshotDate = emitenRows[0]?.snapshotDate ?? null;

  return { emiten, sectors, snapshotDate, fetchedAt };
}

export async function getSectors(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ s: ownership1pctEmiten.sector })
    .from(ownership1pctEmiten)
    .where(sql`${ownership1pctEmiten.sector} is not null and ${ownership1pctEmiten.sector} <> ''`);
  return rows.map((r) => r.s).filter((s): s is string => !!s).sort();
}
