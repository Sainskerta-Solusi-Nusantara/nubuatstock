import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/watchlist/cross-deps";
import { removeItem, updateItem } from "@/lib/watchlist";
import { updateItemInputSchema } from "@/lib/types/watchlist";

interface Ctx {
  params: Promise<{ id: string; itemId: string }>;
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id, itemId } = await params;
    const json = (await req.json().catch(() => ({}))) as unknown;
    const input = updateItemInputSchema.parse(json);
    await updateItem(session.userId, id, itemId, input);
    return ok({ updated: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id, itemId } = await params;
    await removeItem(session.userId, id, itemId);
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
