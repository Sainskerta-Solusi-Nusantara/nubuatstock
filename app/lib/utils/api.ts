import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data } satisfies ApiSuccess<T>, init);
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json(
    { ok: false, error: { code, message, details } } satisfies ApiError,
    { status },
  );
}

export function handleError(err: unknown): NextResponse<ApiError> {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, "AppError");
    } else {
      logger.warn({ err: { code: err.code, message: err.message } }, "AppError");
    }
    return fail(err.statusCode, err.code, err.clientMessage, err.details);
  }
  if (err instanceof ZodError) {
    logger.warn({ issues: err.issues }, "ZodError");
    return fail(400, "VALIDATION_ERROR", "Validasi gagal", err.flatten());
  }
  logger.error({ err }, "Unhandled error");
  return fail(500, "INTERNAL_ERROR", "Terjadi kesalahan internal.");
}
