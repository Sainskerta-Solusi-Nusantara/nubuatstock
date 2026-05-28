import { NextRequest, NextResponse } from "next/server";

import { handleError } from "@/lib/utils/api";
import { requireSession } from "@/lib/auth";
import { auditLog } from "@/lib/observability/audit";
import { buildExportFilename, collectUserData } from "@/lib/account/export";

/**
 * UU PDP — Data export endpoint.
 *
 * `GET`  /api/account/export → download dump JSON semua data milik user login.
 * `POST` /api/account/export → idem (disediakan untuk konsistensi pemanggilan
 *                              dari form/fetch yang lebih suka POST).
 *
 * Auth: WAJIB login. Data difilter ketat by session.userId.
 * Response: file attachment (Content-Disposition) berisi JSON ter-indentasi.
 */
export const dynamic = "force-dynamic";

async function handle(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const data = await collectUserData(session.userId);

    await auditLog({
      action: "account.data_exported",
      targetType: "user",
      targetId: session.userId,
      actorUserId: session.userId,
      ip: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    const filename = buildExportFilename(session.userId);
    const body = JSON.stringify(data, null, 2);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}
