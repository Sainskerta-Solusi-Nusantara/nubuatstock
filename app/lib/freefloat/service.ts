import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { freeFloatStatus, type FreeFloatStatus } from "@/db/schema/freefloat";
import { logger } from "@/lib/logger";
import { fetchFreeFloat, FF_SOURCE_URL, type FfRow } from "./fetch";

export { FF_SOURCE_URL };

export interface FfIngestResult {
  count: number;
  snapshotDate: string | null;
}

/** Replace seluruh data dengan snapshot baru. */
export async function ingestFreeFloat(snapshotDate: string, rows: FfRow[]): Promise<FfIngestResult> {
  const values = rows.map((r) => ({
    snapshotDate,
    kode: r.kode,
    name: r.name,
    board: r.board,
    marketCap: r.marketCap,
    shareholders: r.shareholders,
    freeFloatPct: r.freeFloatPct,
    requiredPct: r.requiredPct,
    status: r.status,
    rank: r.rank,
  }));

  await db.delete(freeFloatStatus);
  const BATCH = 500;
  for (let i = 0; i < values.length; i += BATCH) {
    await db.insert(freeFloatStatus).values(values.slice(i, i + BATCH));
  }
  logger.info({ count: values.length, snapshotDate }, "free float ingested");
  return { count: values.length, snapshotDate };
}

/** Fetch dari sumber + ingest. */
export async function refreshFreeFloat(): Promise<FfIngestResult> {
  const { snapshotDate, rows } = await fetchFreeFloat();
  return ingestFreeFloat(snapshotDate ?? "", rows);
}

export interface FfListResult {
  snapshotDate: string | null;
  total: number;
  rows: FreeFloatStatus[];
  /** Ringkasan status untuk header. */
  summary: { met: number; pending: number; total: number };
}

/** Kategori "sudah memenuhi" vs belum (tenggat) untuk filter & ringkasan. */
const MET = "Telah Memenuhi";

export async function listFreeFloat(opts: {
  q?: string;
  board?: string;
  status?: "all" | "met" | "pending";
  sort?: "kode" | "ff" | "ffdesc" | "mcap";
  page?: number;
  pageSize?: number;
}): Promise<FfListResult> {
  const latest = await db
    .select({ d: freeFloatStatus.snapshotDate })
    .from(freeFloatStatus)
    .orderBy(desc(freeFloatStatus.snapshotDate))
    .limit(1);
  const snapshotDate = latest[0]?.d ?? null;
  if (!snapshotDate) return { snapshotDate: null, total: 0, rows: [], summary: { met: 0, pending: 0, total: 0 } };

  const q = (opts.q ?? "").trim().toUpperCase();
  const pageSize = Math.min(100, Math.max(10, opts.pageSize ?? 25));
  const page = Math.max(1, opts.page ?? 1);
  const offset = (page - 1) * pageSize;

  const conds = [eq(freeFloatStatus.snapshotDate, snapshotDate)];
  if (q) conds.push(ilike(freeFloatStatus.kode, `${q}%`));
  if (opts.board) conds.push(eq(freeFloatStatus.board, opts.board));
  if (opts.status === "met") conds.push(eq(freeFloatStatus.status, MET));
  else if (opts.status === "pending") conds.push(sql`${freeFloatStatus.status} <> ${MET}`);
  const where = and(...conds);

  const orderBy =
    opts.sort === "ff" ? asc(freeFloatStatus.freeFloatPct)
      : opts.sort === "ffdesc" ? desc(freeFloatStatus.freeFloatPct)
        : opts.sort === "mcap" ? desc(freeFloatStatus.marketCap)
          : asc(freeFloatStatus.kode);

  const [countRows, rows, metRows] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(freeFloatStatus).where(where),
    db.select().from(freeFloatStatus).where(where).orderBy(orderBy).limit(pageSize).offset(offset),
    db.select({ n: sql<number>`count(*)::int` }).from(freeFloatStatus)
      .where(and(eq(freeFloatStatus.snapshotDate, snapshotDate), eq(freeFloatStatus.status, MET))),
  ]);

  const totalAll = (await db.select({ n: sql<number>`count(*)::int` }).from(freeFloatStatus).where(eq(freeFloatStatus.snapshotDate, snapshotDate)))[0]?.n ?? 0;
  const met = metRows[0]?.n ?? 0;

  return {
    snapshotDate,
    total: countRows[0]?.n ?? 0,
    rows,
    summary: { met, pending: totalAll - met, total: totalAll },
  };
}

export async function getFreeFloatByKode(kode: string): Promise<FreeFloatStatus | null> {
  const k = kode.trim().toUpperCase();
  const rows = await db
    .select()
    .from(freeFloatStatus)
    .where(eq(freeFloatStatus.kode, k))
    .orderBy(desc(freeFloatStatus.snapshotDate))
    .limit(1);
  return rows[0] ?? null;
}

export interface FfDashData {
  rows: FreeFloatStatus[];
  snapshotDate: string | null;
  boards: string[];
  summary: { met: number; pending: number; total: number };
}

/** Seluruh data Free Float (snapshot terbaru) untuk dashboard review superadmin. */
export async function getFreeFloatDashboard(): Promise<FfDashData> {
  const latest = await db
    .select({ d: freeFloatStatus.snapshotDate })
    .from(freeFloatStatus)
    .orderBy(desc(freeFloatStatus.snapshotDate))
    .limit(1);
  const snapshotDate = latest[0]?.d ?? null;
  if (!snapshotDate) return { rows: [], snapshotDate: null, boards: [], summary: { met: 0, pending: 0, total: 0 } };

  const rows = await db
    .select()
    .from(freeFloatStatus)
    .where(eq(freeFloatStatus.snapshotDate, snapshotDate))
    .orderBy(asc(freeFloatStatus.kode));

  const met = rows.filter((r) => r.status === MET).length;
  const boards = [...new Set(rows.map((r) => r.board).filter((b): b is string => !!b))].sort();
  return { rows, snapshotDate, boards, summary: { met, pending: rows.length - met, total: rows.length } };
}

/** Daftar papan untuk filter. */
export async function getFreeFloatBoards(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ b: freeFloatStatus.board })
    .from(freeFloatStatus)
    .where(sql`${freeFloatStatus.board} is not null and ${freeFloatStatus.board} <> ''`);
  return rows.map((r) => r.b).filter((b): b is string => !!b).sort();
}
