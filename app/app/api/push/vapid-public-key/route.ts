import { getVapidPublicKey } from "@/lib/push/vapid";
import { ok, handleError } from "@/lib/utils/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const key = await getVapidPublicKey();
    return ok({ key, enabled: Boolean(key) });
  } catch (err) {
    return handleError(err);
  }
}
