import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/watchlist/cross-deps";
import { pauseAlert } from "@/lib/alerts";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const alert = await pauseAlert(session.userId, id);
    return ok({ alert });
  } catch (err) {
    return handleError(err);
  }
}
