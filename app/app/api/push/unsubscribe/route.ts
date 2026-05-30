import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { ok, handleError } from "@/lib/utils/api";
import { removeSubscription } from "@/lib/push/subscriptions";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ endpoint: z.string().url() });

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { endpoint } = bodySchema.parse(await req.json());
    await removeSubscription(session.userId, endpoint);
    return ok({ removed: true });
  } catch (err) {
    return handleError(err);
  }
}
