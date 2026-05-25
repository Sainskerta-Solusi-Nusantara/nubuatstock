import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleError, ok } from "@/lib/utils/api";
import { generateTitle } from "@/lib/ai/chat";

export const runtime = "nodejs";

/**
 * POST /api/ai/conversations/[id]/title — regenerate title via mini LLM call
 * berdasarkan pesan pertama user.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const title = await generateTitle(id, session.user.id);
    return ok({ title });
  } catch (err) {
    return handleError(err);
  }
}
