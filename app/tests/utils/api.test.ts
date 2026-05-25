import { describe, expect, it } from "vitest";
import { z, ZodError } from "zod";

/**
 * Tests untuk `lib/utils/api.ts` — response shape helpers.
 *
 * Pastikan kontrak `{ ok, data }` / `{ ok, error: { code, message, details? } }`
 * tetap stabil. Helper `handleError` map error → response yang benar.
 */
describe("lib/utils/api", () => {
  it("ok wraps payload with { ok: true, data }", async () => {
    const { ok } = await import("@/lib/utils/api");
    const res = ok({ name: "Nubuat" });
    expect(res.status).toEqual(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, data: { name: "Nubuat" } });
  });

  it("fail wraps error with { ok: false, error: { code, message } }", async () => {
    const { fail } = await import("@/lib/utils/api");
    const res = fail(404, "NOT_FOUND", "Data tidak ditemukan.");
    expect(res.status).toEqual(404);
    const json = await res.json();
    expect(json).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "Data tidak ditemukan." },
    });
  });

  it("handleError maps ZodError to 400 VALIDATION_ERROR", async () => {
    const { handleError } = await import("@/lib/utils/api");
    let err: ZodError | undefined;
    try {
      z.object({ name: z.string() }).parse({ name: 42 });
    } catch (e) {
      err = e as ZodError;
    }
    const res = handleError(err);
    expect(res.status).toEqual(400);
    const json = await res.json();
    expect(json.ok).toEqual(false);
    expect(json.error.code).toEqual("VALIDATION_ERROR");
  });

  it("handleError maps AppError subclass to its statusCode", async () => {
    const { handleError } = await import("@/lib/utils/api");
    const { NotFoundError } = await import("@/lib/errors");
    const res = handleError(new NotFoundError("Company"));
    expect(res.status).toEqual(404);
    const json = await res.json();
    expect(json.error.code).toEqual("NOT_FOUND");
  });

  it("handleError maps unknown error to 500 INTERNAL_ERROR", async () => {
    const { handleError } = await import("@/lib/utils/api");
    const res = handleError(new Error("boom"));
    expect(res.status).toEqual(500);
    const json = await res.json();
    expect(json.error.code).toEqual("INTERNAL_ERROR");
  });
});
