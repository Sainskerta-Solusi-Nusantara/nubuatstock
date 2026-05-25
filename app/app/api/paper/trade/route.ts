import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/server";
import {
  ensureDefaultPortfolio,
  executeBuy,
  executeSell,
  PaperTradingError,
} from "@/lib/paper-trading/service";
import { handleError } from "@/lib/utils/api";

const bodySchema = z.object({
  portfolioId: z.string().optional(),
  kode: z.string().regex(/^[A-Z0-9]{3,6}$/i),
  side: z.enum(["buy", "sell"]),
  quantity: z.number().int().positive(),
  source: z.string().optional(),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const json = await req.json();
    const parsed = bodySchema.parse(json);

    const portfolioId = parsed.portfolioId ?? (await ensureDefaultPortfolio(session.userId));

    const result =
      parsed.side === "buy"
        ? await executeBuy({
            portfolioId,
            userId: session.userId,
            kode: parsed.kode,
            quantity: parsed.quantity,
            source: parsed.source,
            note: parsed.note,
          })
        : await executeSell({
            portfolioId,
            userId: session.userId,
            kode: parsed.kode,
            quantity: parsed.quantity,
            source: parsed.source,
            note: parsed.note,
          });

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    if (err instanceof PaperTradingError) {
      return NextResponse.json(
        { ok: false, error: { code: err.code, message: err.message } },
        { status: 400 },
      );
    }
    return handleError(err);
  }
}
