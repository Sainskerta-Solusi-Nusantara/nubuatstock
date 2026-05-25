import { getOhlcv } from "@/lib/market-data";
import { logger } from "@/lib/logger";
import type { OhlcvBar } from "@/lib/types/market";

export async function loadOhlcv(kode: string): Promise<OhlcvBar[]> {
  try {
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 5);
    return await getOhlcv(kode, { from, to, interval: "1d" });
  } catch (err) {
    logger.warn({ err, kode }, "loadOhlcv failed");
    return [];
  }
}
