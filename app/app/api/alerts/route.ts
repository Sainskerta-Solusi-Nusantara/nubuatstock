import { handleError, ok } from "@/lib/utils/api";
import { requireSession } from "@/lib/watchlist/cross-deps";
import { createAlert, listAlerts } from "@/lib/alerts";
import {
  createAlertInputSchema,
  listAlertsQuerySchema,
} from "@/lib/types/alerts";

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const query = listAlertsQuerySchema.parse(Object.fromEntries(url.searchParams));
    const data = await listAlerts(session.userId, query);
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const json = (await req.json().catch(() => ({}))) as unknown;
    const input = createAlertInputSchema.parse(json);
    const alert = await createAlert(session.userId, input);
    return ok({ alert }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
