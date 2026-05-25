import { NextResponse } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { listPublicTiers } from "@/lib/billing";
import { getConfig } from "@/lib/config";

/**
 * GET /api/billing/tiers
 *
 * Public — list semua tier publik beserta entitlements untuk pricing page.
 * Tidak butuh auth (calon user perlu lihat harga sebelum signup).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const tiers = await listPublicTiers();
    const disclaimer = await getConfig<string>("app.disclaimer_text");
    const currency = await getConfig<string>("runtime.currency", { defaultValue: "IDR" });
    return ok({
      tiers,
      disclaimer,
      currency,
    });
  } catch (err) {
    return handleError(err);
  }
}
