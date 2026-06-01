"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Menampilkan toast "Logout berhasil" saat user mendarat di landing setelah
 * logout. Route GET /logout redirect ke /?loggedout=1; komponen ini membaca
 * flag itu, memunculkan toast, lalu membersihkan query dari URL.
 *
 * Sengaja baca window.location (bukan useSearchParams) supaya tidak butuh
 * Suspense boundary dan tidak mempengaruhi SSR landing.
 */
export function LogoutToast() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("loggedout") !== "1") return;

    toast.success("Logout berhasil", { description: "Sampai jumpa lagi 👋" });

    params.delete("loggedout");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, []);

  return null;
}
