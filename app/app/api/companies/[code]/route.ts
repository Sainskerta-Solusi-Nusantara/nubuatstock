import type { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { tickerSchema } from "@/lib/types/companies";
import { getCompany } from "@/lib/companies";

/**
 * GET /api/companies/[code]
 *
 * Return detail emiten (join papan + sector + sub_sector).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await ctx.params;
    const validated = tickerSchema.parse(code.toUpperCase());
    const company = await getCompany(validated);
    return ok(company);
  } catch (err) {
    return handleError(err);
  }
}
