import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/watchlist/cross-deps";
import {
  deleteWatchlist,
  getWatchlistWithQuotes,
  renameWatchlist,
} from "@/lib/watchlist";
import { renameWatchlistInputSchema } from "@/lib/types/watchlist";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const detail = await getWatchlistWithQuotes(session.userId, id);
    return ok(detail);
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const json = (await req.json().catch(() => ({}))) as unknown;
    const input = renameWatchlistInputSchema.parse(json);
    const watchlist = await renameWatchlist(session.userId, id, input);
    return ok({ watchlist });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await deleteWatchlist(session.userId, id);
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
