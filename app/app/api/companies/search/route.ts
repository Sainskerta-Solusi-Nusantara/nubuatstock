import type { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { companySearchQuerySchema } from "@/lib/types/companies";
import { searchCompanies } from "@/lib/companies";

/**
 * GET /api/companies/search?q=&limit=
 *
 * Fuzzy match untuk command palette / autocomplete UI.
 * Ordering: exact kode → prefix kode → name contains.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = companySearchQuerySchema.parse({
      q: searchParams.get("q") ?? "",
      limit: searchParams.get("limit") ?? undefined,
    });
    const hits = await searchCompanies(parsed.q, { limit: parsed.limit });
    return ok({ items: hits });
  } catch (err) {
    return handleError(err);
  }
}
