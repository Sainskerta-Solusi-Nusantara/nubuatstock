import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { securitiesPicks, type SecuritiesPick, type NewSecuritiesPick } from "@/db/schema/securities-picks";

/** Daftar sekuritas yang umum jadi sumber (untuk dropdown admin). */
export const COMMON_SECURITIES = [
  "Henan Putihrai Sekuritas",
  "Mirae Asset Sekuritas",
  "Indo Premier Sekuritas",
  "BRI Danareksa Sekuritas",
  "Mandiri Sekuritas",
  "BNI Sekuritas",
  "Phintraco Sekuritas",
  "MNC Sekuritas",
  "Samuel Sekuritas",
  "Ajaib Sekuritas",
  "Kiwoom Sekuritas",
  "Sucor Sekuritas",
  "Panin Sekuritas",
  "RHB Sekuritas",
];

export interface SecuritiesPickGroup {
  securities: string;
  picks: SecuritiesPick[];
}

/** Tanggal pick terbaru yang ada di DB. */
export async function getLatestPickDate(): Promise<string | null> {
  const r = await db
    .select({ d: securitiesPicks.pickDate })
    .from(securitiesPicks)
    .orderBy(desc(securitiesPicks.pickDate))
    .limit(1);
  return r[0]?.d ?? null;
}

/** Picks pada tanggal tertentu (default terbaru), dikelompokkan per sekuritas. */
export async function listSecuritiesPicksGrouped(date?: string): Promise<{ date: string | null; groups: SecuritiesPickGroup[] }> {
  const pickDate = date ?? (await getLatestPickDate());
  if (!pickDate) return { date: null, groups: [] };

  const rows = await db
    .select()
    .from(securitiesPicks)
    .where(eq(securitiesPicks.pickDate, pickDate))
    .orderBy(asc(securitiesPicks.securities), asc(securitiesPicks.kode));

  const map = new Map<string, SecuritiesPick[]>();
  for (const r of rows) {
    const arr = map.get(r.securities) ?? [];
    arr.push(r);
    map.set(r.securities, arr);
  }
  const groups = [...map.entries()].map(([securities, picks]) => ({ securities, picks }));
  return { date: pickDate, groups };
}

/** Semua picks (admin), urut tanggal desc lalu sekuritas. */
export async function listAllSecuritiesPicks(limit = 300): Promise<SecuritiesPick[]> {
  return db
    .select()
    .from(securitiesPicks)
    .orderBy(desc(securitiesPicks.pickDate), asc(securitiesPicks.securities), asc(securitiesPicks.kode))
    .limit(limit);
}

/** Upsert satu pick (idempotent per tanggal+sekuritas+kode). */
export async function addSecuritiesPick(input: NewSecuritiesPick): Promise<void> {
  const now = new Date();
  await db
    .insert(securitiesPicks)
    .values({ ...input, kode: input.kode.toUpperCase() })
    .onConflictDoUpdate({
      target: [securitiesPicks.pickDate, securitiesPicks.securities, securitiesPicks.kode],
      set: {
        action: input.action ?? null,
        entryLow: input.entryLow ?? null,
        entryHigh: input.entryHigh ?? null,
        support: input.support ?? null,
        resistance: input.resistance ?? null,
        target: input.target ?? null,
        stopLoss: input.stopLoss ?? null,
        rationale: input.rationale ?? null,
        sourceUrl: input.sourceUrl ?? null,
        updatedAt: now,
      },
    });
}

export async function deleteSecuritiesPick(id: string): Promise<void> {
  await db.delete(securitiesPicks).where(eq(securitiesPicks.id, id));
}

export async function countSecuritiesPicks(): Promise<{ total: number; sources: number; date: string | null }> {
  const [tot] = await db.select({ n: sql<number>`count(*)::int` }).from(securitiesPicks);
  const date = await getLatestPickDate();
  const srcRows = date
    ? await db.select({ s: securitiesPicks.securities }).from(securitiesPicks).where(eq(securitiesPicks.pickDate, date)).groupBy(securitiesPicks.securities)
    : [];
  return { total: tot?.n ?? 0, sources: srcRows.length, date };
}
