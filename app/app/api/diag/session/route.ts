import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/diag/session — diagnostik sesi (sementara).
 *
 * Menampilkan apakah route handler bisa membaca sesi user yang sedang login,
 * dan apakah cookie sesi benar-benar terkirim ke route handler. TIDAK membocorkan
 * rahasia — hanya info sesi pemanggil sendiri + NAMA cookie (bukan nilainya).
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieNames = cookieHeader
    .split(";")
    .map((c) => c.split("=")[0]?.trim())
    .filter(Boolean);

  return Response.json(
    {
      hasSession: !!session,
      userId: session?.userId ?? null,
      email: session?.email ?? null,
      role: session?.role ?? null,
      cookieCount: cookieNames.length,
      cookieNames,
      hasSessionTokenCookie: cookieNames.some((n) => /session/i.test(n ?? "")),
      runtime: "nodejs",
      buildMarker: "diag-2026-06-01",
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
