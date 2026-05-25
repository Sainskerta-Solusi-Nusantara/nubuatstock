import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/watchlist/cross-deps";
import { createWatchlist, listWatchlists } from "@/lib/watchlist";
import { createWatchlistInputSchema } from "@/lib/types/watchlist";

export async function GET() {
  try {
    const session = await requireSession();
    const items = await listWatchlists(session.userId);
    return ok({ items });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const json = (await req.json().catch(() => ({}))) as unknown;
    const input = createWatchlistInputSchema.parse(json);
    const watchlist = await createWatchlist(session.userId, input);
    return ok({ watchlist }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
