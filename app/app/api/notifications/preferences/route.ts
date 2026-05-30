import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { ok, handleError } from "@/lib/utils/api";
import { getOrCreatePreferences, updatePreferences } from "@/lib/notifications/preferences";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  alertsEnabled: z.boolean().optional(),
  dailyPicksEnabled: z.boolean().optional(),
  newsEnabled: z.boolean().optional(),
  quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
  quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
  dailyCap: z.number().int().min(0).max(100).optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const prefs = await getOrCreatePreferences(session.userId);
    return ok(prefs);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const patch = patchSchema.parse(await req.json());
    const prefs = await updatePreferences(session.userId, patch);
    return ok(prefs);
  } catch (err) {
    return handleError(err);
  }
}
