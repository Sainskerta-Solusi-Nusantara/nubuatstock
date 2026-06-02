import { NextRequest } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { ok, handleError } from "@/lib/utils/api";
import { addSecuritiesPick, deleteSecuritiesPick } from "@/lib/securities-picks/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const num = z.union([z.number(), z.string()]).optional().transform((v) => {
  if (v === undefined || v === "" || v === null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[.,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
});

const schema = z.object({
  pickDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  securities: z.string().min(2),
  kode: z.string().min(2).max(10),
  action: z.string().optional().nullable(),
  entryLow: num,
  entryHigh: num,
  support: num,
  resistance: num,
  target: num,
  stopLoss: num,
  rationale: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    requireSuperadmin(await getSession());
    const body = await req.json();
    const data = schema.parse(body);
    await addSecuritiesPick({
      pickDate: data.pickDate,
      securities: data.securities.trim(),
      kode: data.kode.trim().toUpperCase(),
      action: data.action ?? null,
      entryLow: data.entryLow,
      entryHigh: data.entryHigh,
      support: data.support,
      resistance: data.resistance,
      target: data.target,
      stopLoss: data.stopLoss,
      rationale: data.rationale?.trim() || null,
      sourceUrl: data.sourceUrl?.trim() || null,
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
    await deleteSecuritiesPick(id);
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
