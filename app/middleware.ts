import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware tingkat Edge.
 *
 * CATATAN: Edge runtime TIDAK punya akses langsung ke DB (postgres.js + Drizzle).
 * Maka CORS allowlist diambil dari header response yang di-set di server action /
 * route handler. Middleware ini hanya menangani security headers + redirect basic.
 *
 * Auth check dilakukan di server-side helper `requireSession()` (Agent 3).
 * Tier check dilakukan di endpoint handler (Agent 4 helpers).
 */

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const origin = req.headers.get("origin");
  const requestId = crypto.randomUUID();
  res.headers.set("x-request-id", requestId);

  // CORS preflight handling — actual allowlist enforcement happens in route handler
  // (where we can read DB). Middleware here is permissive but adds the request id.
  if (origin && req.method === "OPTIONS") {
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.headers.set("Access-Control-Max-Age", "86400");
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
