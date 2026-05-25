/**
 * Custom error classes. Setiap error punya HTTP status code & client-safe message.
 * Server logs full detail, client hanya dapat code+message.
 */

export class AppError extends Error {
  override readonly name: string = "AppError";
  readonly statusCode: number = 500;
  readonly code: string = "INTERNAL_ERROR";
  readonly clientMessage: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, opts: { clientMessage?: string; details?: Record<string, unknown> } = {}) {
    super(message);
    this.clientMessage = opts.clientMessage ?? "Terjadi kesalahan internal.";
    this.details = opts.details;
  }
}

export class ValidationError extends AppError {
  override readonly name = "ValidationError";
  override readonly statusCode = 400;
  override readonly code = "VALIDATION_ERROR";
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { clientMessage: message, details });
  }
}

export class UnauthorizedError extends AppError {
  override readonly name = "UnauthorizedError";
  override readonly statusCode = 401;
  override readonly code = "UNAUTHORIZED";
  constructor(message = "Authentication required") {
    super(message, { clientMessage: "Silakan login terlebih dahulu." });
  }
}

export class ForbiddenError extends AppError {
  override readonly name: string = "ForbiddenError";
  override readonly statusCode: number = 403;
  override readonly code: string = "FORBIDDEN";
  constructor(message = "Access denied", clientMessage = "Anda tidak memiliki izin.") {
    super(message, { clientMessage });
  }
}

export class TierRequiredError extends ForbiddenError {
  override readonly name = "TierRequiredError";
  override readonly code = "TIER_REQUIRED";
  constructor(requiredTier: string, currentTier: string) {
    super(`Required tier ${requiredTier}, user is on ${currentTier}`,
      `Fitur ini tersedia untuk paket ${requiredTier} ke atas. Upgrade untuk melanjutkan.`);
  }
}

export class NotFoundError extends AppError {
  override readonly name = "NotFoundError";
  override readonly statusCode = 404;
  override readonly code = "NOT_FOUND";
  constructor(resource: string) {
    super(`${resource} not found`, { clientMessage: "Data tidak ditemukan." });
  }
}

export class QuotaExceededError extends AppError {
  override readonly name = "QuotaExceededError";
  override readonly statusCode = 429;
  override readonly code = "QUOTA_EXCEEDED";
  constructor(quotaKey: string, limit: number) {
    super(`Quota exceeded for ${quotaKey} (limit ${limit})`, {
      clientMessage: `Kuota harian Anda telah habis. Upgrade paket untuk kuota lebih besar.`,
      details: { quotaKey, limit },
    });
  }
}

export class RateLimitError extends AppError {
  override readonly name = "RateLimitError";
  override readonly statusCode = 429;
  override readonly code = "RATE_LIMITED";
  constructor(retryAfterSec: number) {
    super(`Rate limited, retry after ${retryAfterSec}s`, {
      clientMessage: "Terlalu banyak request. Coba lagi sebentar.",
      details: { retryAfterSec },
    });
  }
}

export class ConfigurationError extends AppError {
  override readonly name = "ConfigurationError";
  override readonly statusCode = 503;
  override readonly code = "NOT_CONFIGURED";
  constructor(setting: string) {
    super(`Missing configuration: ${setting}`, {
      clientMessage: "Fitur ini belum dikonfigurasi. Hubungi administrator.",
      details: { setting },
    });
  }
}
