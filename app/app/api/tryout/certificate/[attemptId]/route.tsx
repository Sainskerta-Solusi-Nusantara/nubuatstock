import { NextRequest } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { Buffer } from "node:buffer";
import { getSession } from "@/lib/auth/server";
import { getConfig } from "@/lib/config";
import { fail, handleError } from "@/lib/utils/api";
import { getAttempt } from "@/lib/tryout/service";
import { TryoutCertificate } from "@/lib/tryout/certificate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tryout/certificate/[attemptId]
 * Download Certificate of Completion (PDF) — HANYA kalau attempt milik user & LULUS.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return fail(401, "UNAUTHORIZED", "Silakan login dulu.");
    const userId = (session as { userId?: string; user?: { id?: string } }).userId ?? session.user?.id;
    if (!userId) return fail(401, "UNAUTHORIZED", "Sesi tidak valid.");

    const { attemptId } = await params;
    const result = await getAttempt(userId, attemptId);
    if (!result) return fail(404, "NOT_FOUND", "Hasil try out tidak ditemukan.");
    if (!result.passed) {
      return fail(403, "NOT_PASSED", "Sertifikat hanya tersedia untuk hasil yang LULUS.");
    }

    const appName = await getConfig<string>("app.name", { defaultValue: "Nubuat" });
    const dateLabel = result.submittedAt.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const stream = await renderToStream(
      TryoutCertificate({
        name: session.user?.name || session.user?.email || "Peserta",
        packageTitle: result.packageTitle,
        scorePct: result.scorePct,
        correct: result.correct,
        total: result.total,
        dateLabel,
        certificateId: `NBT-WMI-${result.attemptId.slice(0, 8).toUpperCase()}`,
        appName,
      }),
    );

    // Kumpulkan stream → Buffer.
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdf = Buffer.concat(chunks);

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Sertifikat-WMI-${result.packageSlug}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
