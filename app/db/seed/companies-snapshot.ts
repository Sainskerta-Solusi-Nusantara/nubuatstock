/**
 * Komplemen seedCompanies: merge daftar lengkap emiten dari snapshot KSEI/Kontan.
 *
 * Static seed (Agent 2) hanya kover ±83 emiten IDX80 dengan metadata lengkap
 * (papan, sektor, tanggal IPO). Untuk universe lengkap ±960 emiten BEI, jalankan:
 *
 *   npm run db:fetch-emiten              # scrape KSEI → db/seed/data/emiten.json
 *   npm run db:seed                       # akan otomatis merge snapshot
 *
 * Emiten dari snapshot yang BELUM ada di static seed akan di-insert dengan
 * placeholder:
 *   - papan_kode = "UTAMA"   (asumsi mayoritas; admin reklasifikasi via UI)
 *   - sector_kode = "UNCLASSIFIED" (sentinel sektor; di-insert otomatis kalau
 *     belum ada di tabel sectors)
 *
 * Admin nantinya bisa klasifikasi via /admin/companies — atau jalankan
 * scrape lanjutan (kontan punya sektor per emiten) untuk auto-fill.
 *
 * Idempotent: ON CONFLICT DO NOTHING di kode.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../../lib/db";
import { companies } from "../schema/companies";
import { sectors } from "../schema/reference";
import { logger } from "../../lib/logger";

interface SnapshotPayload {
  totalCount: number;
  fetchedAt: string;
  primarySource: string;
  records: Array<{
    kode: string;
    nama: string;
    source: string;
    fetchedAt: string;
    papan?: string;
    sector?: string;
  }>;
}

const SNAPSHOT_PATH = resolve(process.cwd(), "db/seed/data/emiten.json");
const UNCLASSIFIED_SECTOR = {
  kode: "UNCLASSIFIED",
  namaId: "Belum Diklasifikasi",
  namaEn: "Unclassified",
  deskripsi: "Sektor sementara untuk emiten yang belum diklasifikasi admin. Update via /admin/companies.",
  orderIndex: 99,
  colorHex: "#94a3b8",
};

async function loadSnapshot(): Promise<SnapshotPayload | null> {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf-8");
    const data = JSON.parse(raw) as SnapshotPayload;
    if (!data.records || !Array.isArray(data.records)) {
      logger.warn({ path: SNAPSHOT_PATH }, "Snapshot exists but invalid shape — skip");
      return null;
    }
    return data;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      logger.info(
        "Snapshot emiten belum ada (db/seed/data/emiten.json). Jalankan `npm run db:fetch-emiten` untuk universe lengkap. Skip merge.",
      );
    } else {
      logger.warn({ err }, "Failed reading emiten snapshot — skip merge");
    }
    return null;
  }
}

async function ensureUnclassifiedSector(): Promise<void> {
  await db
    .insert(sectors)
    .values({
      kode: UNCLASSIFIED_SECTOR.kode,
      namaId: UNCLASSIFIED_SECTOR.namaId,
      namaEn: UNCLASSIFIED_SECTOR.namaEn,
      deskripsi: UNCLASSIFIED_SECTOR.deskripsi,
      orderIndex: UNCLASSIFIED_SECTOR.orderIndex,
      colorHex: UNCLASSIFIED_SECTOR.colorHex,
    })
    .onConflictDoNothing({ target: sectors.kode });
}

export async function mergeCompaniesFromSnapshot(): Promise<void> {
  const snapshot = await loadSnapshot();
  if (!snapshot) return;

  logger.info(
    { totalCount: snapshot.totalCount, source: snapshot.primarySource },
    "Merging emiten snapshot ke tabel companies",
  );

  await ensureUnclassifiedSector();

  // Bulk fetch existing kode untuk skip cepat
  const existing = await db.select({ kode: companies.kode }).from(companies);
  const existingSet = new Set(existing.map((r) => r.kode));

  const toInsert = snapshot.records.filter((r) => !existingSet.has(r.kode));
  if (toInsert.length === 0) {
    logger.info("Semua emiten dari snapshot sudah ada di DB — tidak ada insert baru.");
    return;
  }

  logger.info(`Inserting ${toInsert.length} emiten baru dari snapshot (placeholder metadata)...`);

  // Chunk insert untuk hindari parameter limit
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    const values = chunk.map((r) => ({
      kode: r.kode,
      namaPerusahaan: r.nama,
      papanKode: (r.papan ?? "UTAMA") as "UTAMA",
      sectorKode: r.sector ?? UNCLASSIFIED_SECTOR.kode,
      isActive: true,
      isSyariah: false,
    }));
    const res = await db.insert(companies).values(values).onConflictDoNothing({ target: companies.kode });
    inserted += chunk.length;
    logger.info(`Inserted chunk ${i + 1}-${i + chunk.length}`);
  }

  // Final count
  const finalCount = await db.select({ kode: companies.kode }).from(companies);
  logger.info(
    {
      snapshotCount: snapshot.totalCount,
      newlyInserted: toInsert.length,
      totalInDb: finalCount.length,
    },
    "Snapshot merge selesai",
  );
}
