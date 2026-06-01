import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/server";
import { ok, fail, handleError } from "@/lib/utils/api";
import { importBalancePos } from "@/lib/ksei/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/ksei/upload — upload file KSEI BalancePos (pipe-delimited .txt).
 * Admin only. Parse → simpan ke DB (idempotent per tanggal posisi).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail(400, "NO_FILE", "File tidak ditemukan. Pilih file BalancePos .txt dari KSEI.");
    }
    if (file.size > 20 * 1024 * 1024) {
      return fail(400, "TOO_LARGE", "File terlalu besar (maks 20MB).");
    }
    const content = await file.text();
    const result = await importBalancePos(content, {
      fileName: file.name,
      actorUserId: session.userId,
    });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
