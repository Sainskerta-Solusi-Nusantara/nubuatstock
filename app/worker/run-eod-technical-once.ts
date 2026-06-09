/**
 * Jalankan rantai harga sekali (manual, tanpa worker):
 *   EOD ingest  →  Technical Snapshots
 * Supaya preset teknikal Screener (Swing dll) & filter teknikal langsung berisi.
 *
 *   npx tsx --env-file=.env worker/run-eod-technical-once.ts
 */
import type { Job } from "bullmq";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { ingestEodProcessor } from "@/worker/jobs/ingest-eod";
import { computeTechnicalSnapshotsProcessor } from "@/worker/jobs/compute-technical-snapshots";

function stub(name: string, data: Record<string, unknown> = {}): Job {
  return { data, name, id: "manual" } as unknown as Job;
}

async function count(table: string): Promise<string> {
  const r = await db.execute<{ n: number; d: string }>(
    sql.raw(`select count(*)::int as n, max(trade_date)::text as d from ${table}`),
  );
  const row = (r as unknown as Array<{ n: number; d: string }>)[0];
  return `${row?.n ?? 0} baris (terbaru ${row?.d ?? "—"})`;
}

async function main() {
  console.log("EOD sebelum :", await count("quotes_eod"));
  console.log("\n[1/2] Ingest EOD (5 hari terakhir, semua emiten aktif)…");
  const eod = await ingestEodProcessor(stub("ingest-eod", { daysBack: 5 }), "");
  console.log("EOD result :", JSON.stringify(eod));
  console.log("EOD sesudah:", await count("quotes_eod"));

  console.log("\n[2/2] Hitung Technical Snapshots…");
  const tech = await computeTechnicalSnapshotsProcessor(stub("technical-snapshots"), "");
  console.log("Technical result:", JSON.stringify(tech));
  console.log("technical_snapshots:", await count("technical_snapshots"));

  console.log("\n=== SELESAI ===");
  process.exit(0);
}

main().catch((e) => {
  console.error("ERROR:", e?.stack ?? e?.message ?? e);
  process.exit(1);
});
