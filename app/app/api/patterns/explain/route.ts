import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { patternDetections } from "@/db/schema/patterns";
import { companies } from "@/db/schema/companies";
import { quotesEod } from "@/db/schema/market";
import { desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/server";
import { generatePatternExplanation } from "@/lib/patterns/ai-explanation";
import { handleError } from "@/lib/utils/api";
import type { PatternType } from "@/lib/patterns/types";

const bodySchema = z.object({
  patternId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    await requireSession();
    const json = await req.json();
    const { patternId } = bodySchema.parse(json);

    const [pattern] = await db
      .select()
      .from(patternDetections)
      .where(eq(patternDetections.id, patternId))
      .limit(1);
    if (!pattern) {
      return NextResponse.json({ ok: false, error: "Pattern not found" }, { status: 404 });
    }

    // Cek apakah sudah ada AI explanation (narrative != null && diawali dengan AI marker)
    if (pattern.narrative && pattern.narrative.startsWith("AI:")) {
      return NextResponse.json({
        ok: true,
        data: { explanation: pattern.narrative.replace(/^AI:\s*/, ""), cached: true },
      });
    }

    const [company] = await db
      .select({ name: companies.namaPerusahaan })
      .from(companies)
      .where(eq(companies.kode, pattern.companyKode))
      .limit(1);

    const [latest] = await db
      .select({ close: quotesEod.close })
      .from(quotesEod)
      .where(eq(quotesEod.companyKode, pattern.companyKode))
      .orderBy(desc(quotesEod.tradeDate))
      .limit(1);

    const explanation = await generatePatternExplanation({
      ticker: pattern.companyKode,
      patternType: pattern.patternType as PatternType,
      direction: pattern.direction as "bullish" | "bearish",
      status: pattern.status as "forming" | "completed" | "invalidated",
      confidence: Number(pattern.confidence),
      keyLevels: pattern.keyLevels,
      volumeConfirmation: pattern.volumeConfirmation,
      companyName: company?.name ?? null,
      currentPrice: latest ? Number(latest.close) : null,
    });

    if (explanation) {
      await db
        .update(patternDetections)
        .set({ narrative: `AI: ${explanation}`, updatedAt: new Date() })
        .where(eq(patternDetections.id, patternId));
    }

    return NextResponse.json({ ok: true, data: { explanation, cached: false } });
  } catch (err) {
    return handleError(err);
  }
}
