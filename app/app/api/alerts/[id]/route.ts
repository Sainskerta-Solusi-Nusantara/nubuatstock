import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/watchlist/cross-deps";
import { deleteAlert, updateAlert } from "@/lib/alerts";
import { updateAlertInputSchema } from "@/lib/types/alerts";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const json = (await req.json().catch(() => ({}))) as unknown;
    const input = updateAlertInputSchema.parse(json);
    const alert = await updateAlert(session.userId, id, input);
    return ok({ alert });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await deleteAlert(session.userId, id);
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
