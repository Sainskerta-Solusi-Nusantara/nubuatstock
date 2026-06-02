import { NextRequest } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { ok, handleError } from "@/lib/utils/api";
import { addManualReport, deleteReport } from "@/lib/securities-reports/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  securities: z.string().min(2),
  title: z.string().min(3),
  category: z.string().optional().nullable(),
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    requireSuperadmin(await getSession());
    const data = schema.parse(await req.json());
    await addManualReport({
      securities: data.securities,
      title: data.title,
      category: data.category ?? null,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      sourceUrl: data.sourceUrl ?? null,
      pdfUrl: data.pdfUrl ?? null,
    });
    return ok({ saved: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    requireSuperadmin(await getSession());
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return handleError(new Error("id wajib"));
    await deleteReport(id);
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
