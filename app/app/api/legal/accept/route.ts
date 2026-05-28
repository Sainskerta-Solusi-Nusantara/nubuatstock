import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { ok, handleError } from "@/lib/utils/api";
import {
  getCurrentLegalVersion,
  recordAcceptance,
  LEGAL_DOCUMENT_TYPES,
} from "@/lib/legal/acceptance";

const schema = z.object({
  // `version` opsional & informasional saja — versi yang DISIMPAN selalu
  // diresolusi server-side dari config supaya client tidak bisa "accept"
  // versi sembarang dan melewati gate re-accept.
  version: z.string().min(1).max(20).optional(),
  documents: z
    .array(z.enum(["disclaimer", "terms", "privacy"]))
    .min(1)
    .max(3)
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const { documents } = schema.parse(body);

    const docs = documents ?? [...LEGAL_DOCUMENT_TYPES];

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const userAgent = req.headers.get("user-agent") ?? undefined;

    const accepted: { document: string; version: string }[] = [];
    for (const doc of docs) {
      // Versi terkini diresolusi server-side — bukan dari body request.
      const version = await getCurrentLegalVersion(doc);
      await recordAcceptance({
        userId: session.userId,
        documentType: doc,
        version,
        ip: ip ?? undefined,
        userAgent,
      });
      accepted.push({ document: doc, version });
    }

    return ok({ accepted });
  } catch (err) {
    return handleError(err);
  }
}
