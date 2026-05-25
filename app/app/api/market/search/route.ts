import { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/utils/api";
import { searchTickers } from "@/lib/market-data";
import { searchQuerySchema } from "@/lib/types/market";

/**
 * GET /api/market/search?q=BBRI&limit=20
 *
 * Auth: required. Mengembalikan hasil DB + augmented adapter (kalau tersedia).
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const url = new URL(req.url);
    const query = searchQuerySchema.parse({
      q: url.searchParams.get("q") ?? "",
      limit: url.searchParams.get("limit") ?? undefined,
    });
    const results = await searchTickers(query.q, query.limit);
    return ok({ q: query.q, count: results.length, results });
  } catch (err) {
    return handleError(err);
  }
}
