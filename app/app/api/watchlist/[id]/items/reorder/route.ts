import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/watchlist/cross-deps";
import { reorderItems } from "@/lib/watchlist";
import { reorderItemsInputSchema } from "@/lib/types/watchlist";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const json = (await req.json().catch(() => ({}))) as unknown;
    const input = reorderItemsInputSchema.parse(json);
    await reorderItems(session.userId, id, input);
    return ok({ reordered: true });
  } catch (err) {
    return handleError(err);
  }
}
