import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/observability/health";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public health endpoint — TIDAK butuh auth.
 * Status 200 jika `db` & `redis` ok, 503 jika ada yang fail.
 * Worker degraded TIDAK menyebabkan 503 (HTTP API tetap bisa serve walau worker down).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await checkHealth();
    return NextResponse.json(result, {
      status: result.ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    logger.error({ err }, "Health check unexpected error");
    return NextResponse.json(
      {
        ok: false,
        version: "unknown",
        uptimeSeconds: 0,
        checks: {
          db: "unknown",
          redis: "unknown",
          worker: { status: "unknown", lastHeartbeatAt: null, ageSeconds: null },
        },
        error: "Health check failed",
      },
      { status: 503 },
    );
  }
}
