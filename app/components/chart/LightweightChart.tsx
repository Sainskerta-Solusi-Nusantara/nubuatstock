"use client";

import dynamic from "next/dynamic";

import type { LightweightChartProps } from "@/lib/types/ui";

/**
 * Lazy-loaded LightweightChart wrapper.
 *
 * `lightweight-charts` (~40KB gzip) di-code-split lewat next/dynamic + ssr:false,
 * jadi library hanya di-download saat chart benar-benar dirender (bukan ikut di
 * bundle awal halaman). Semua pemakai `LightweightChart` otomatis dapat manfaat
 * tanpa perubahan di sisi mereka. Implementasi asli ada di LightweightChartImpl.
 */
export const LightweightChart = dynamic<LightweightChartProps>(
  () => import("./LightweightChartImpl").then((m) => m.LightweightChart),
  {
    ssr: false,
    loading: () => (
      <div
        role="img"
        aria-label="Memuat grafik harga"
        className="w-full animate-pulse rounded-md border bg-muted/30"
        style={{ height: 360 }}
      />
    ),
  },
);
