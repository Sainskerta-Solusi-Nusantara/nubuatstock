import { describe, expect, it } from "vitest";

/**
 * Tests untuk logika pure di `lib/account/**` (UU PDP export & delete).
 *
 * Fokus ke fungsi yang tidak butuh DB:
 *  - computeScheduledDeletion — grace period 30 hari.
 *  - buildExportFilename — nama file stabil & aman.
 */
describe("lib/account/delete", () => {
  it("computeScheduledDeletion adds exactly 30 days", async () => {
    const { computeScheduledDeletion, DELETION_GRACE_DAYS } = await import(
      "@/lib/account/delete"
    );
    expect(DELETION_GRACE_DAYS).toBe(30);

    const from = new Date("2026-01-01T00:00:00.000Z");
    const scheduled = computeScheduledDeletion(from);
    expect(scheduled.toISOString()).toBe("2026-01-31T00:00:00.000Z");
  });

  it("computeScheduledDeletion is always in the future relative to input", async () => {
    const { computeScheduledDeletion } = await import("@/lib/account/delete");
    const now = new Date();
    const scheduled = computeScheduledDeletion(now);
    expect(scheduled.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("lib/account/export", () => {
  it("buildExportFilename embeds sanitized userId and ISO date", async () => {
    const { buildExportFilename } = await import("@/lib/account/export");
    const now = new Date("2026-05-29T12:34:56.000Z");
    const name = buildExportFilename("01HXYZ_ABC-123", now);
    expect(name).toBe("nubuat-data-export-01HXYZ_ABC-123-2026-05-29.json");
  });

  it("buildExportFilename strips unsafe characters from userId", async () => {
    const { buildExportFilename } = await import("@/lib/account/export");
    const now = new Date("2026-05-29T00:00:00.000Z");
    const name = buildExportFilename('../../etc/pa"ss wd', now);
    expect(name).toBe("nubuat-data-export-etcpasswd-2026-05-29.json");
    expect(name).not.toContain("/");
    expect(name).not.toContain('"');
    expect(name).not.toContain(" ");
  });
});
