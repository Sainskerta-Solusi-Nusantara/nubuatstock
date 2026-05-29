import type { Processor } from "bullmq";
import { logger } from "@/lib/logger";
import { computeLeaderboard } from "@/lib/paper-trading/engine";

/**
 * Paper Trading leaderboard snapshot — daily job.
 *
 * Jalan setiap hari setelah EoD ingest selesai (post-market). Hitung total value
 * tiap portfolio (cash + Σ posisi × last close), return%, lalu tulis 1 row per
 * portfolio ke `paper_leaderboard_snapshots` (idempotent via unique
 * (portfolio_id, snapshot_date)). Leaderboard live (getLeaderboard) membaca
 * snapshot terbaru per window.
 *
 * Job data (opsional):
 *   - snapshotDate?: string (YYYY-MM-DD) — override tanggal snapshot (backfill).
 */
export const paperLeaderboardProcessor: Processor = async (job) => {
  const data = (job.data ?? {}) as { snapshotDate?: string };
  const result = await computeLeaderboard({ snapshotDate: data.snapshotDate });
  logger.info(
    { snapshotDate: result.snapshotDate, portfolios: result.portfolios },
    "paper-leaderboard snapshot job done",
  );
  return result;
};
