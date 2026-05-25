import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { handleError, ok } from "@/lib/utils/api";
import {
  assertSupportedProvider,
  createPendingUpgrade,
  createTransaction,
} from "@/lib/billing";
import { db } from "@/lib/db";
import { invoices as invoicesTable } from "@/db/schema/billing";
import { eq } from "drizzle-orm";
import {
  subscribeRequestSchema,
  type SubscribeResponse,
} from "@/lib/types/billing";

/**
 * POST /api/billing/subscribe
 *
 * Body: { tierKode, billingCycle, provider }
 *
 * Flow MVP:
 *  1. Validate body via Zod.
 *  2. Create draft invoice + return invoice id.
 *  3. Call provider.createTransaction (stub MVP — return null token).
 *  4. Client redirect ke checkout (Midtrans Snap / Xendit Invoice URL).
 *  5. Webhook /api/billing/webhook/* yang aktivasi subscription.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const body = await req.json().catch(() => ({}));
    const parsed = subscribeRequestSchema.parse(body);
    const provider = assertSupportedProvider(parsed.provider);

    const pending = await createPendingUpgrade({
      userId: session.user.id,
      targetTierKode: parsed.tierKode,
      billingCycle: parsed.billingCycle,
      provider,
    });

    // Fetch full invoice untuk passed ke provider.
    const inv = await db
      .select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, pending.invoiceId))
      .limit(1);

    const tx = await createTransaction(provider, {
      invoice: inv[0]!,
      customer: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    });

    // Update invoice dengan provider id kalau ada.
    if (tx.providerInvoiceId) {
      await db
        .update(invoicesTable)
        .set({
          status: "sent",
          providerInvoiceId: tx.providerInvoiceId,
          metadata: { providerRaw: tx.raw },
          updatedAt: new Date(),
        })
        .where(eq(invoicesTable.id, pending.invoiceId));
    } else {
      await db
        .update(invoicesTable)
        .set({ status: "sent", updatedAt: new Date() })
        .where(eq(invoicesTable.id, pending.invoiceId));
    }

    const response: SubscribeResponse = {
      invoiceId: pending.invoiceId,
      invoiceNumber: pending.invoiceNumber,
      amountIdr: pending.amountIdr,
      provider,
      redirectUrl: tx.redirectUrl,
      paymentToken: tx.paymentToken,
      status: "pending_payment",
    };

    return ok(response);
  } catch (err) {
    return handleError(err);
  }
}
