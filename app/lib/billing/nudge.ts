import { TIER_RANK, type TierKode } from "../types/billing";

/**
 * Helper murni untuk lapisan UI "upgrade nudge". TIDAK menyentuh entitlement
 * atau limit yang sebenarnya — semua gating tetap di lib/billing/entitlements.
 * Modul ini hanya membantu komponen memutuskan kapan & dengan pesan apa nudge
 * ditampilkan.
 */

/** Label tier yang ramah pengguna (untuk teks nudge). */
export const TIER_LABEL: Record<TierKode, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  elite: "Elite",
  institutional: "Institutional",
};

/**
 * Apakah user di `currentTier` perlu di-nudge untuk pakai fitur yang butuh
 * `requiredTier`? True kalau tier user lebih rendah dari yang dibutuhkan.
 * Aman saat input tier tidak dikenal (anggap rank 0 / free).
 */
export function shouldNudge(
  currentTier: TierKode | string | null | undefined,
  requiredTier: TierKode,
): boolean {
  const currentRank = TIER_RANK[(currentTier ?? "free") as TierKode] ?? 0;
  const requiredRank = TIER_RANK[requiredTier] ?? 0;
  return currentRank < requiredRank;
}

/**
 * Daftar pesan nudge per fitur. Key bebas (dipakai komponen), value berisi
 * tier minimum + copy default. Komponen boleh override message via props.
 */
export const NUDGE_COPY: Record<
  string,
  { requiredTier: TierKode; feature: string; message: string }
> = {
  "backtest.advanced": {
    requiredTier: "pro",
    feature: "Backtest lanjutan",
    message: "Buka parameter backtest lengkap dengan upgrade ke Pro.",
  },
  "export.enabled": {
    requiredTier: "pro",
    feature: "Ekspor data",
    message: "Ekspor hasil analisis ke CSV/Excel tersedia mulai tier Pro.",
  },
  "ai.queries_per_day": {
    requiredTier: "starter",
    feature: "AI Buddy lebih banyak",
    message: "Tambah kuota tanya AI Buddy harian dengan upgrade paket.",
  },
  "watchlist.max_items": {
    requiredTier: "starter",
    feature: "Watchlist lebih luas",
    message: "Pantau lebih banyak ticker dengan upgrade paket.",
  },
  "alerts.max_active": {
    requiredTier: "starter",
    feature: "Alert lebih banyak",
    message: "Aktifkan lebih banyak alert harga dengan upgrade paket.",
  },
  "picks.daily_visible": {
    requiredTier: "pro",
    feature: "Daily Picks penuh",
    message: "Lihat seluruh Daily Picks tiap hari dengan upgrade ke Pro.",
  },
};
