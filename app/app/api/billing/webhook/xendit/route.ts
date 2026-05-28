import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { z } from "zod";
import { handleError, ok } from "@/lib/utils/api";
import { logger } from "@/lib/logger";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { db } from "@/lib/db";
import { invoices as invoicesTable, payments } from "@/db/schema/billing";
import {
  activatePaidSubscription,
  mapXenditStatus,
  verifyXenditSignature,
} from "@/lib/billing";

/**
 * POST /api/billing/webhook/xendit
 *
 * Xendit kirim header `x-callback-token` untuk simple verification. Untuk
 * setup HMAC signed (opsional), header `x-callback-signature` + body raw.
 *
 * Body sample (Invoice paid):
 *   {
 *     id, external_id, status, amount, payment_method, payment_channel,
 *     paid_at, ...
 *   }
 *
 * Kita pakai `external_id` = invoice_number kita.
 */

const xenditSchema = z.object({
  id: z.string(),
  external_id: z.string(),
  status: z.string(),
  amount: z.number(),
  payment_method: z.string().optional(),
  payment_channel: z.string().optional(),
  paid_at: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const callbackToken = req.headers.get("x-callback-token") ?? "";
    const signature = req.headers.get("x-callback-signature") ?? undefined;
    const rawBody = await req.text();

    const valid = await verifyXenditSignature({
      callbackToken,
      body: rawBody,
      signature,
    });
    if (!valid) {
      logger.warn({ provider: "xendit" }, "Rejected Xendit webhook: invalid x-callback-token");
      // 401 — reject forged/untokened callbacks BEFORE any business logic.
      throw new UnauthorizedError("Invalid callback token");
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new ValidationError("Malformed JSON body");
    }
    const parsed = xenditSchema.parse(body);

    const status = mapXenditStatus(parsed.status);

    const invs = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.invoiceNumber, parsed.external_id))
      .limit(1);

    if (invs.length === 0) {
      logger.warn({ externalId: parsed.external_id }, "Xendit webhook for unknown external_id");
      throw new ValidationError("Unknown external_id");
    }
    const invoice = invs[0]!;

    await db
      .insert(payments)
      .values({
        id: ulid(),
        invoiceId: invoice.id,
        userId: invoice.userId,
        amountIdr: Math.round(parsed.amount),
        currency: "IDR",
        provider: "xendit",
        providerPaymentId: parsed.id,
        providerTransactionId: parsed.id,
        paymentMethod: parsed.payment_method ?? parsed.payment_channel ?? null,
        status:
          status === "success"
            ? "success"
            : status === "expired"
              ? "expired"
              : status === "failed"
                ? "failed"
                : "pending",
        paidAt: parsed.paid_at ? new Date(parsed.paid_at) : status === "success" ? new Date() : null,
        rawResponse: parsed,
      })
      .onConflictDoNothing({
        target: [payments.provider, payments.providerPaymentId],
      });

    if (status === "success" && invoice.status !== "paid") {
      await activatePaidSubscription({
        userId: invoice.userId,
        invoiceId: invoice.id,
      });
    } else if (status === "expired" || status === "failed") {
      await db
        .update(invoicesTable)
        .set({
          status: status === "expired" ? "void" : "uncollectible",
          updatedAt: new Date(),
        })
        .where(eq(invoicesTable.id, invoice.id));
    }

    return ok({ received: true });
  } catch (err) {
    return handleError(err);
  }
}
