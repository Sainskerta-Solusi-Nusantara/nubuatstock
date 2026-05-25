import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/watchlist/cross-deps";
import { reorderWatchlists } from "@/lib/watchlist";
import { reorderWatchlistsInputSchema } from "@/lib/types/watchlist";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const json = (await req.json().catch(() => ({}))) as unknown;
    const input = reorderWatchlistsInputSchema.parse(json);
    await reorderWatchlists(session.userId, input);
    return ok({ reordered: true });
  } catch (err) {
    return handleError(err);
  }
}
