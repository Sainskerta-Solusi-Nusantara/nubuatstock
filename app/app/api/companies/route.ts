import type { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { companyListQuerySchema } from "@/lib/types/companies";
import { listCompanies } from "@/lib/companies";

/**
 * GET /api/companies
 *
 * Query params:
 *   q       — search by kode / nama
 *   sector  — filter by sector_kode (e.g. ENERGY, FINANCIALS)
 *   index   — filter by index constituency (e.g. IDX80, LQ45)
 *   papan   — filter by papan_kode (e.g. UTAMA)
 *   syariah — "true" | "false"
 *   active  — "true" | "false" (default: all)
 *   limit   — int 1-200 (default 50)
 *   offset  — int >= 0
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = companyListQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      sector: searchParams.get("sector") ?? undefined,
      index: searchParams.get("index") ?? undefined,
      papan: searchParams.get("papan") ?? undefined,
      syariah: searchParams.get("syariah") ?? undefined,
      active: searchParams.get("active") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    const result = await listCompanies({
      q: parsed.q,
      sectorKode: parsed.sector,
      indexKode: parsed.index,
      papanKode: parsed.papan,
      isSyariah: parsed.syariah,
      isActive: parsed.active,
      limit: parsed.limit,
      offset: parsed.offset,
    });

    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
