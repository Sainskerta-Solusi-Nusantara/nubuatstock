import { renderToBuffer } from "@react-pdf/renderer";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { requireAdmin } from "@/lib/auth/server";
import { handleError } from "@/lib/utils/api";
import { logger } from "@/lib/logger";
import { FeaturePdf } from "@/lib/pitchdeck/feature-pdf";
import { PITCHDECK_FEATURES } from "@/lib/pitchdeck/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pitchdeck/feature-pdf
 *
 * Generate Feature Guide PDF dengan screenshot tiap halaman. Akses: superadmin only.
 *
 * Screenshot diambil dari `public/pitchdeck/screenshots/<slug>.png` (di-capture
 * sebelumnya via `scripts/capture-pitchdeck-screenshots.ts`). PDF self-contained:
 * screenshot di-embed sebagai data URI base64.
 *
 * Kalau ada screenshot yang missing, PDF tetap di-generate — halaman fitur
 * menampilkan placeholder "Screenshot belum tersedia".
 */
export async function GET() {
  try {
    await requireAdmin();

    const screenshotsDir = join(process.cwd(), "public", "pitchdeck", "screenshots");
    const screenshots: Record<string, string> = {};
    let missing = 0;

    for (const feature of PITCHDECK_FEATURES) {
      const filePath = join(screenshotsDir, `${feature.slug}.png`);
      try {
        const s = await stat(filePath);
        if (!s.isFile()) {
          missing += 1;
          continue;
        }
        const buf = await readFile(filePath);
        screenshots[feature.slug] = `data:image/png;base64,${buf.toString("base64")}`;
      } catch {
        missing += 1;
      }
    }

    if (missing > 0) {
      logger.warn(
        { missing, total: PITCHDECK_FEATURES.length },
        "feature-pdf: some screenshots missing — placeholder akan dipakai",
      );
    }

    const buffer = await renderToBuffer(
      <FeaturePdf
        screenshots={screenshots}
        generatedAt={new Date()}
        featureCount={PITCHDECK_FEATURES.length}
      />,
    );

    const date = new Date().toISOString().slice(0, 10);
    const filename = `Nubuat-Feature-Guide-${date}.pdf`;

    return new Response(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Screenshots-Missing": String(missing),
        "X-Features-Total": String(PITCHDECK_FEATURES.length),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
