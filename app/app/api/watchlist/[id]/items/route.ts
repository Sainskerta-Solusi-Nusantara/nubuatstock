import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/watchlist/cross-deps";
import { addItem } from "@/lib/watchlist";
import { addItemInputSchema } from "@/lib/types/watchlist";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const json = (await req.json().catch(() => ({}))) as unknown;
    const input = addItemInputSchema.parse(json);
    const item = await addItem(session.userId, id, input);
    return ok({ item }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
