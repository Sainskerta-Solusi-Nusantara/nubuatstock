import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { researchReports, researchDownloads } from "@/db/schema/research";
import { companies } from "@/db/schema/companies";
import { getSession, requireSession } from "@/lib/auth/server";
import { getConfig } from "@/lib/config";
import { ok, fail, handleError } from "@/lib/utils/api";
import { ResearchReportPDF } from "@/lib/research/pdf-template";
import { logger } from "@/lib/logger";

/**
 * GET /api/research/[id]/pdf
 *
 * Generate PDF of research report on-the-fly and stream to client.
 * Requires session (free tier OK for free reports; tier-gating per report enforced).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const rows = await db
      .select()
      .from(researchReports)
      .where(and(eq(researchReports.id, id), eq(researchReports.status, "published"), isNull(researchReports.deletedAt)))
      .limit(1);
    if (rows.length === 0) return fail(404, "NOT_FOUND", "Laporan tidak ditemukan");
    const report = rows[0]!;

    // Tier gating: requireTier check (soft-import billing)
    if (report.minTierRequired !== "free") {
      try {
        const billing = await import("@/lib/billing");
        const requireTier = (billing as { requireTier?: (userId: string, tier: string) => Promise<void> }).requireTier;
        if (requireTier) await requireTier(session.userId, report.minTierRequired);
      } catch (err) {
        return fail(403, "TIER_REQUIRED", `Laporan ini hanya untuk tier ${report.minTierRequired.toUpperCase()} ke atas. Upgrade untuk akses.`);
      }
    }

    // Load company name for header
    let companyName: string | undefined;
    if (report.companyKode) {
      const c = await db
        .select({ nama: companies.namaPerusahaan })
        .from(companies)
        .where(eq(companies.kode, report.companyKode))
        .limit(1);
      companyName = c[0]?.nama;
    }

    const [appName, disclaimer] = await Promise.all([
      getConfig<string>("app.name", { defaultValue: "Nubuat" }),
      getConfig<string>("app.disclaimer_text", { defaultValue: "Informasi edukasi semata, bukan ajakan jual/beli." }),
    ]);

    const buffer = await renderToBuffer(
      <ResearchReportPDF
        report={report}
        ticker={report.companyKode ?? undefined}
        companyName={companyName}
        appName={appName}
        disclaimer={disclaimer}
      />,
    );

    // Audit download
    await db.insert(researchDownloads).values({
      reportId: report.id,
      userId: session.userId,
      fileSize: buffer.length,
      userAgent: req.headers.get("user-agent"),
    }).catch((err) => logger.warn({ err }, "Failed to log research download"));

    // Increment download counter (best-effort)
    await db
      .update(researchReports)
      .set({ downloadCount: report.downloadCount + 1, pdfGeneratedAt: new Date(), pdfFileSize: buffer.length })
      .where(eq(researchReports.id, report.id))
      .catch(() => undefined);

    const filename = `${appName}-Research-${report.companyKode ?? report.slug}-${new Date(report.publishedAt ?? Date.now()).toISOString().slice(0, 10)}.pdf`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
