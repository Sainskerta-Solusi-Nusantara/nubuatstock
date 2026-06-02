import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import { ok, fail, handleError } from "@/lib/utils/api";
import { getElliottWaveForTicker } from "@/lib/elliott/service";
import { projectTargets, guidelineScore } from "@/lib/elliott/projection";
import { generateElliottNarrative } from "@/lib/elliott/narrative";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  kode: z.string().min(2).max(12),
  timeframe: z.string().min(1).max(4).default("1D"),
});

/**
 * POST /api/elliott/narrative — narasi AI Elliott Wave ON-DEMAND (user klik).
 *
 * Body: { kode, timeframe? }. Auth: sesi user. Memuat snapshot terbaru, hitung
 * proyeksi + guideline (pure), lalu generate narasi via DeepSeek. Tidak di-cache
 * (volume rendah, dipicu user). Return { narrative }.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const { kode, timeframe } = bodySchema.parse(await req.json());

    const snap = await getElliottWaveForTicker(kode, timeframe);
    if (!snap) return fail(404, "NOT_FOUND", "Belum ada analisis Elliott untuk saham ini.");

    const targets = projectTargets(snap.sequence);
    const guide = snap.sequence.length > 0 ? guidelineScore(snap.sequence) : null;

    const narrative = await generateElliottNarrative({
      companyKode: snap.kode,
      timeframe: snap.timeframe,
      analysis: { waveType: snap.waveType, currentWave: snap.currentWave, confidence: snap.confidence },
      targets,
      guidelineScore: guide ? Math.round(guide.score) : undefined,
      degree: snap.waveDegree ?? undefined,
    });

    if (!narrative) return fail(422, "NO_NARRATIVE", "Pola belum cukup jelas untuk dinarasikan.");
    return ok({ narrative });
  } catch (err) {
    if (err instanceof SyntaxError) return fail(400, "BAD_REQUEST", "Body bukan JSON valid.");
    return handleError(err);
  }
}
