import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { ok, fail, handleError } from "@/lib/utils/api";
import { parseNlQuery } from "@/lib/screener/nl";
import { runScreener } from "@/lib/screener/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().min(1).max(500),
});

/**
 * POST /api/screener/nl
 *
 * Body: { query: string } — query NL Bahasa Indonesia.
 * Auth: sesi user biasa (requireSession), sama seperti /api/saved-screens.
 *
 * Flow: parseNlQuery (DeepSeek → filter terstruktur tervalidasi) → runScreener
 * (logic inti, REUSE). Balas { filter, raw, results }.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession();

    const json = await req.json();
    const { query } = bodySchema.parse(json);

    const { filter, raw } = await parseNlQuery(query);
    const result = await runScreener(filter);

    return ok({
      query,
      filter,
      // `raw` = output mentah AI sebelum dipakai (berguna utk debugging UI).
      raw,
      results: result,
    });
  } catch (err) {
    // ConfigurationError (AI key belum di-set) sudah jadi AppError → handleError
    // memetakan ke status yang benar dengan clientMessage ramah.
    if (err instanceof SyntaxError) {
      return fail(400, "BAD_REQUEST", "Body bukan JSON valid.");
    }
    return handleError(err);
  }
}
