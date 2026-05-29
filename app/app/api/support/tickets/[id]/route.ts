import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { addUserReply, getUserTicket } from "@/lib/support/service";
import { handleError, ok } from "@/lib/utils/api";

interface Ctx {
  params: Promise<{ id: string }>;
}

const replySchema = z.object({
  message: z.string().min(1).max(5000),
});

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const data = await getUserTicket(session.userId, id);
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const json = await req.json();
    const parsed = replySchema.parse(json);
    await addUserReply(session.userId, id, parsed.message);
    return ok({ replied: true });
  } catch (err) {
    return handleError(err);
  }
}
