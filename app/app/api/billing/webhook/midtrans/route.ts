import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { z } from "zod";
import { handleError, ok } from "@/lib/utils/api";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { db } from "@/lib/db";
import { invoices as invoicesTable, payments } from "@/db/schema/billing";
import {
  activatePaidSubscription,
  mapMidtransStatus,
  verifyMidtransSignature,
} from "@/lib/billing";

/**
 * POST /api/billing/webhook/midtrans
 *
 * Public endpoint — verify HMAC signature.
 *
 * Notification body Midtrans (sample):
 *   {
 *     order_id, transaction_status, status_code, gross_amount,
 *     signature_key, transaction_id, payment_type, ...
 *   }
 *
 * Mapping order_id → invoice_id: kita pakai `invoiceNumber` sebagai order_id
 * ke Midtrans saat createTransaction. Webhook lookup invoice via invoice_number.
 *
 * Idempotency: hash signature_key + transaction_id sudah unique di Midtrans;
 * kita lewatkan duplicate webhook lewat check status invoice sudah `paid`.
 */

const midtransSchema = z.object({
  order_id: z.string(),
  transaction_status: z.string(),
  status_code: z.string(),
  gross_amount: z.string(),
  signature_key: z.string(),
  transaction_id: z.string().optional(),
  payment_type: z.string().optional(),
  fraud_status: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const parsed = midtransSchema.parse(body);

    const validSig = await verifyMidtransSignature({
      orderId: parsed.order_id,
      statusCode: parsed.status_code,
      grossAmount: parsed.gross_amount,
      signatureKey: parsed.signature_key,
    });
    if (!validSig) {
      logger.warn({ orderId: parsed.order_id }, "Midtrans webhook signature invalid");
      throw new ValidationError("Invalid signature");
    }

    const status = mapMidtransStatus(parsed.transaction_status);

    // Resolve invoice by invoice_number (order_id).
    const invs = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.invoiceNumber, parsed.order_id))
      .limit(1);

    if (invs.length === 0) {
      logger.warn({ orderId: parsed.order_id }, "Midtrans webhook for unknown order_id");
      throw new ValidationError("Unknown order_id");
    }
    const invoice = invs[0]!;

    // Persist payment record (idempotent on provider_payment_id).
    if (parsed.transaction_id) {
      await db
        .insert(payments)
        .values({
          id: ulid(),
          invoiceId: invoice.id,
          userId: invoice.userId,
          amountIdr: Math.round(Number.parseFloat(parsed.gross_amount)),
          currency: "IDR",
          provider: "midtrans",
          providerPaymentId: parsed.transaction_id,
          providerTransactionId: parsed.transaction_id,
          paymentMethod: parsed.payment_type ?? null,
          status: status === "success" ? "success" : status === "expired" ? "expired" : status === "failed" ? "failed" : "pending",
          paidAt: status === "success" ? new Date() : null,
          // raw_response logged via Pino redact paths
          rawResponse: parsed,
        })
        .onConflictDoNothing({
          target: [payments.provider, payments.providerPaymentId],
        });
    }

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
