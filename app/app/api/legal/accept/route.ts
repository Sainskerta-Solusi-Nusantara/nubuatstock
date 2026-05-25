import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { ok, handleError } from "@/lib/utils/api";
import { recordAcceptance } from "@/lib/legal/acceptance";

const schema = z.object({
  version: z.string().min(1).max(20),
  documents: z.array(z.enum(["disclaimer", "terms", "privacy"])).min(1).max(3),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const { version, documents } = schema.parse(body);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const userAgent = req.headers.get("user-agent") ?? undefined;

    for (const doc of documents) {
      await recordAcceptance({
        userId: session.userId,
        documentType: doc,
        version,
        ip: ip ?? undefined,
        userAgent,
      });
    }

    return ok({ accepted: documents, version });
  } catch (err) {
    return handleError(err);
  }
}
