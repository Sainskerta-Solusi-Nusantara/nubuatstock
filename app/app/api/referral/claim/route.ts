import { cookies } from "next/headers";
import { z } from "zod";
import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/auth";
import { attributeSignup } from "@/lib/referral";

/** Cookie tempat code disimpan saat visitor landing dengan `?ref=CODE`. */
const REF_COOKIE = "nubuat_ref";

const claimSchema = z.object({
  /** Optional — kalau tidak ada, route baca dari cookie `nubuat_ref`. */
  code: z.string().trim().min(1).max(32).optional(),
});

/**
 * POST /api/referral/claim — authenticated.
 *
 * Attribute user yang sedang login ke referrer berdasarkan code dari body
 * (manual entry) atau cookie `nubuat_ref` (auto, di-set saat landing `?ref=`).
 * Idempotent: self-refer / sudah pernah di-attribute → no-op. Cookie selalu
 * di-clear setelah dibaca.
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const json = (await req.json().catch(() => ({}))) as unknown;
    const { code: bodyCode } = claimSchema.parse(json);

    const store = await cookies();
    const cookieCode = store.get(REF_COOKIE)?.value;
    const code = (bodyCode ?? cookieCode ?? "").trim();

    let attributed = false;
    if (code) {
      const result = await attributeSignup(session.user.id, code);
      attributed = !!result;
    }

    // Clear cookie apa pun hasilnya supaya tidak bocor ke sesi lain.
    try {
      store.delete(REF_COOKIE);
    } catch {
      // delete() bisa throw di context tertentu — tidak fatal, cookie akan expire.
    }

    return ok({ attributed });
  } catch (err) {
    return handleError(err);
  }
}
