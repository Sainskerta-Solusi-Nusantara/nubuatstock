import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getConfig, getSecret, hasSecret } from "../config";
import { logger } from "../logger";
import { ConfigurationError, ValidationError } from "../errors";
import type { Invoice } from "@/db/schema/billing";
import type { SubscriptionProvider } from "../types/billing";

/**
 * Payment gateway provider abstraction.
 *
 * MVP: stub create-transaction & verify-signature. Saat integrasi real, replace
 * `createTransaction` body dengan HTTP call ke Midtrans Snap API / Xendit
 * Invoices API. Signature verification adalah skeleton yang sudah benar
 * (HMAC-SHA512 untuk Xendit; SHA-512 Midtrans).
 *
 * Secrets dibaca dari `app_secrets` via lib/config.ts:
 *   - payment.midtrans.server_key
 *   - payment.midtrans.client_key
 *   - payment.xendit.api_key
 *   - payment.xendit.webhook_token (admin add via UI saat siap)
 *
 * Config (non-secret) dari `app_config`:
 *   - payment.midtrans.base_url (sandbox vs prod)
 *   - payment.xendit.base_url
 *   - payment.success_redirect_url
 *   - payment.failure_redirect_url
 */

export interface CreateTransactionInput {
  invoice: Invoice;
  customer: {
    userId: string;
    email: string;
    name: string;
  };
}

export interface CreateTransactionResult {
  provider: SubscriptionProvider;
  paymentToken: string | null;
  redirectUrl: string | null;
  providerInvoiceId: string | null;
  raw: Record<string, unknown>;
}

/**
 * Saat siap, ganti stub ini dengan call ke `/v2/charge` Midtrans atau
 * `/v2/invoices` Xendit. Untuk MVP, return null token + log info bahwa
 * provider belum dikonfigurasi sehingga UI tampilkan empty state.
 */
export async function createTransaction(
  provider: SubscriptionProvider,
  input: CreateTransactionInput,
): Promise<CreateTransactionResult> {
  if (provider === "manual") {
    return {
      provider,
      paymentToken: null,
      redirectUrl: null,
      providerInvoiceId: null,
      raw: { manual: true },
    };
  }

  // Cek apakah secret provider sudah dikonfigurasi admin.
  const secretKey = provider === "midtrans" ? "payment.midtrans.server_key" : "payment.xendit.api_key";
  const configured = await hasSecret(secretKey);

  if (!configured) {
    logger.warn(
      { provider, invoiceId: input.invoice.id },
      "Payment provider not configured — admin needs to set secret",
    );
    throw new ConfigurationError(secretKey);
  }

  // STUB: di sini akan ada HTTP call. Untuk MVP return placeholder.
  // Server key tetap dibaca supaya tidak ada warning unused & memastikan
  // decryption path bekerja.
  await getSecret(secretKey);

  logger.info(
    { provider, invoiceId: input.invoice.id },
    "createTransaction STUB — replace with real Midtrans/Xendit HTTP call",
  );

  return {
    provider,
    paymentToken: null,
    redirectUrl: null,
    providerInvoiceId: null,
    raw: { stub: true, provider, invoiceId: input.invoice.id },
  };
}

/**
 * Midtrans signature verification.
 * Format: SHA512(order_id + status_code + gross_amount + server_key)
 * Spec: https://docs.midtrans.com/reference/notification-handling#signature-key
 */
export async function verifyMidtransSignature(payload: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): Promise<boolean> {
  // Reject early if the payload carries no signature at all — never let an
  // unsigned webhook reach the comparison (defense in depth; route also guards).
  if (!payload.signatureKey) {
    return false;
  }

  // Server key MUST come from the encrypted secret store (never hardcoded).
  // Treat a missing key as a configuration error (503) rather than a silent
  // pass/fail, so the misconfiguration is surfaced instead of accepting forged
  // notifications.
  const serverKey = await getSecret("payment.midtrans.server_key").catch(() => null);
  if (!serverKey) {
    throw new ConfigurationError("payment.midtrans.server_key");
  }

  // Midtrans spec: signature_key = SHA512(order_id + status_code + gross_amount + server_key)
  // (lowercase hex). Comparison is timing-safe.
  const expected = createHash("sha512")
    .update(`${payload.orderId}${payload.statusCode}${payload.grossAmount}${serverKey}`)
    .digest("hex");
  return safeEqual(expected, payload.signatureKey);
}

/**
 * Xendit webhook verification — bisa pakai callback token header `x-callback-token`
 * (simple shared secret) atau HMAC-SHA256 untuk yang signed.
 * Spec: https://docs.xendit.co/xenplatform/webhooks
 */
export async function verifyXenditSignature(payload: {
  callbackToken: string;
  body?: string;
  signature?: string;
}): Promise<boolean> {
  // Reject early if the request arrived without the `x-callback-token` header.
  if (!payload.callbackToken) {
    return false;
  }

  // Default Xendit pakai shared token di header. Token MUST come from the
  // encrypted secret store (never hardcoded).
  const expected = await getSecret("payment.xendit.webhook_token").catch(() => null);
  if (!expected) {
    throw new ConfigurationError("payment.xendit.webhook_token");
  }
  if (!safeEqual(expected, payload.callbackToken)) {
    return false;
  }

  // Kalau Xendit pakai HMAC signature (optional setup), verify juga.
  if (payload.signature && payload.body) {
    const hmac = createHmac("sha256", expected).update(payload.body).digest("hex");
    if (!safeEqual(hmac, payload.signature)) return false;
  }
  return true;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function getPaymentRedirectUrls(): Promise<{ success: string; failure: string }> {
  const success = await getConfig<string>("payment.success_redirect_url", {
    defaultValue: "/subscription/manage?status=success",
  });
  const failure = await getConfig<string>("payment.failure_redirect_url", {
    defaultValue: "/subscription/manage?status=failure",
  });
  return { success, failure };
}

/**
 * Parse Midtrans webhook status → app status. Mapping:
 *   capture / settlement → success
 *   pending → pending
 *   expire / cancel → expired
 *   deny / failure → failed
 */
export function mapMidtransStatus(transactionStatus: string): "success" | "pending" | "failed" | "expired" {
  switch (transactionStatus) {
    case "capture":
    case "settlement":
      return "success";
    case "pending":
      return "pending";
    case "expire":
    case "cancel":
      return "expired";
    case "deny":
    case "failure":
      return "failed";
    default:
      return "pending";
  }
}

/**
 * Parse Xendit webhook event type → app status.
 *   invoice.paid → success
 *   invoice.expired → expired
 *   invoice.failed → failed
 */
export function mapXenditStatus(eventStatus: string): "success" | "pending" | "failed" | "expired" {
  switch (eventStatus.toUpperCase()) {
    case "PAID":
    case "SETTLED":
      return "success";
    case "EXPIRED":
      return "expired";
    case "FAILED":
      return "failed";
    default:
      return "pending";
  }
}

export function assertSupportedProvider(provider: string): SubscriptionProvider {
  if (provider !== "midtrans" && provider !== "xendit" && provider !== "manual") {
    throw new ValidationError(`Unsupported payment provider: ${provider}`);
  }
  return provider as SubscriptionProvider;
}
