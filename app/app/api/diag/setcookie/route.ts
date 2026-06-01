export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/diag/setcookie — set beberapa cookie test (atribut beda-beda) untuk
 * mengisolasi kenapa cookie sesi tidak tersimpan di browser. SEMENTARA, akan dihapus.
 *
 * Setelah buka ini, buka /api/diag/session dan lihat cookieNames yang bertahan.
 */
export async function GET() {
  const h = new Headers();
  // 1. Persis seperti cookie better-auth tanpa prefix __Secure-: Secure+HttpOnly+Lax.
  h.append("Set-Cookie", "nubuat_diagtest=1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600");
  // 2. Dengan prefix __Secure- (yang dipakai useSecureCookies). Kalau ini HILANG
  //    tapi #1 ada → prefix __Secure- ditolak browser-mu = akar masalahnya.
  h.append("Set-Cookie", "__Secure-nubuat_diagtest=1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600");
  // 3. Non-HttpOnly (biar kelihatan di document.cookie) — cek apakah cookie sama sekali bisa disimpan.
  h.append("Set-Cookie", "diag_js=1; Path=/; Secure; SameSite=Lax; Max-Age=600");

  h.set("Content-Type", "application/json");
  h.set("Cache-Control", "private, no-store");
  return new Response(
    JSON.stringify({
      set: true,
      next: "Sekarang buka /api/diag/session — lihat cookieNames. Lalu cek document.cookie (harus ada diag_js).",
    }),
    { headers: h },
  );
}
