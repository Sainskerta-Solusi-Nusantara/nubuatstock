import { getActiveAdapter } from "@/lib/market-data/adapters/factory";
import { logger } from "@/lib/logger";

/**
 * Resolusi urutan sentuh TP1 vs SL memakai seri intraday 5-menit (Yahoo).
 *
 * Dipakai HANYA saat sebuah pick "ambigu" menurut EOD — yaitu high/low window
 * menyentuh TP1 sekaligus SL — sehingga kita tak tahu mana yang kena duluan.
 * Dengan seri close 5-menit kita telusuri kronologis: level pertama yang
 * tersentuh menentukan menang/kalah.
 *
 * Dilakukan ON-THE-FLY (tanpa menyimpan ke `quotes_intraday`) agar tak ada
 * pipeline/retensi tambahan. Yahoo interval=5m menyimpan histori ~60 hari, jadi
 * picks dalam window evaluasi (≤ ~30 hari) bisa di-resolve, termasuk retroaktif.
 *
 * @returns true  = SL tersentuh lebih dulu (loss)
 *          false = TP1 tersentuh lebih dulu (win)
 *          null  = tak dapat ditentukan (intraday kosong / wick di luar close 5m)
 */
export async function resolveSlBeforeTp(
  kode: string,
  windowStartDate: string, // "YYYY-MM-DD" inklusif
  windowEndDate: string, // "YYYY-MM-DD" inklusif
  tp1: number,
  sl: number,
): Promise<boolean | null> {
  if (!(tp1 > 0) || !(sl > 0)) return null;

  const adapter = await getActiveAdapter();
  if (!adapter.fetchIntraday) return null;

  // Yahoo interval=5m hanya menerima token range "1d"/"5d"/"1mo" (≤ ~60 hari);
  // "3mo" → HTTP 422. "1mo" (≈31 hari) cukup untuk window evaluasi pick terbaru.
  let points;
  try {
    points = await adapter.fetchIntraday(kode, "1mo");
  } catch (err) {
    logger.warn({ err: (err as Error).message, kode }, "intraday-resolve fetch gagal");
    return null;
  }
  if (!points || points.length === 0) return null;

  const startMs = Date.parse(`${windowStartDate}T00:00:00Z`);
  const endMs = Date.parse(`${windowEndDate}T23:59:59Z`);

  const bars = points
    .map((p) => ({ t: Date.parse(p.ts), price: Number(p.price) }))
    .filter((b) => Number.isFinite(b.price) && b.t >= startMs && b.t <= endMs)
    .sort((a, b) => a.t - b.t);

  for (const b of bars) {
    // Untuk long valid: tp1 > sl, jadi satu bar tak mungkin memicu keduanya.
    if (b.price <= sl) return true; // SL duluan
    if (b.price >= tp1) return false; // TP1 duluan
  }
  return null; // tak ada close 5m yang menembus level (kemungkinan wick) → tak tentu
}
