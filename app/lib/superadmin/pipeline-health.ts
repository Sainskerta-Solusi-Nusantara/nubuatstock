import { getPipelineStatus, type PipelineStatus } from "./pipeline-status";

/**
 * Deteksi pipeline data yang BASI (stale) untuk alerting di superadmin.
 *
 * Ambang sengaja konservatif supaya tidak cry-wolf saat akhir pekan (pasar tutup
 * Sab–Min) atau jeda malam: data pasar dianggap basi bila >72 jam tak update
 * (menangkap kasus "mati berhari-hari"), berita >12 jam. Tujuan utama: menangkap
 * outage multi-hari seperti yang pernah terjadi, BUKAN gap normal.
 */

type Key = keyof PipelineStatus;

const THRESHOLD_HOURS: Record<Key, number> = {
  news: 12,
  eod: 72,
  technical: 72,
  picks: 72,
  securities: 72,
};

const LABEL: Record<Key, string> = {
  news: "Berita",
  eod: "Harga EOD",
  technical: "Technical Snapshots",
  picks: "Daily Picks",
  securities: "Daily Picks Sekuritas",
};

export interface PipelineHealthItem {
  key: Key;
  label: string;
  stale: boolean;
  ageHours: number | null;
  detail: string;
}

export interface PipelineHealth {
  stale: PipelineHealthItem[];
  items: PipelineHealthItem[];
}

function ageHours(lastAt: string | null): number | null {
  if (!lastAt) return null;
  const t = new Date(lastAt).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / 3_600_000;
}

export async function getPipelineHealth(): Promise<PipelineHealth> {
  const status = await getPipelineStatus();
  const items: PipelineHealthItem[] = (Object.keys(THRESHOLD_HOURS) as Key[]).map((key) => {
    const age = ageHours(status[key].lastAt);
    const limit = THRESHOLD_HOURS[key];
    const stale = age === null || age > limit;
    const detail =
      age === null
        ? "belum ada data"
        : `update ${Math.floor(age)} jam lalu (ambang ${limit}j)`;
    return { key, label: LABEL[key], stale, ageHours: age, detail };
  });
  return { stale: items.filter((i) => i.stale), items };
}
