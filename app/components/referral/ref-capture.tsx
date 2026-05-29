"use client";

import { useEffect } from "react";

/**
 * RefCapture — mount di halaman signup. Kalau visitor landing dengan
 * `?ref=CODE`, simpan code ke cookie `nubuat_ref` (30 hari) supaya bisa
 * di-attribute setelah user signup & login (lihat /api/referral/claim).
 *
 * Client-only, tidak render apa-apa.
 */
export function RefCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref")?.trim();
    if (!ref) return;
    // Simpan max 32 char, uppercase (samakan dengan resolveCode).
    const code = ref.slice(0, 32).toUpperCase();
    const maxAge = 60 * 60 * 24 * 30; // 30 hari
    document.cookie = `nubuat_ref=${encodeURIComponent(code)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  }, []);

  return null;
}
