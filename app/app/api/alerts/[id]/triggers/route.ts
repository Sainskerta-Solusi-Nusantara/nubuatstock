import { z } from "zod";
import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/watchlist/cross-deps";
import { listTriggers } from "@/lib/alerts";

interface Ctx {
  params: Promise<{ id: string }>;
}

const triggerQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const url = new URL(req.url);
    const { limit, offset } = triggerQuerySchema.parse(
      Object.fromEntries(url.searchParams),
    );
    const items = await listTriggers(session.userId, id, limit, offset);
    return ok({ items });
  } catch (err) {
    return handleError(err);
  }
}
