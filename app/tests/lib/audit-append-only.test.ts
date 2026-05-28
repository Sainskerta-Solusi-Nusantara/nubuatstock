import { describe, expect, it, vi } from "vitest";

/**
 * Tests append-only contract untuk audit writer (IMPROVEMENT_PLAN §8.2).
 *
 * Penegakan KERAS ada di level DB (trigger RAISE EXCEPTION + REVOKE) via
 * db/migrations/0000_audit_log_immutability.sql. Test ini menjaga sisi APP:
 * memastikan modul observability/audit hanya meng-export writer berbasis INSERT
 * dan tidak pernah memanggil .update()/.delete() pada tabel audit, supaya
 * regresi (penambahan mutasi) ketahuan lebih awal.
 */

// Stub db: rekam method apa saja yang dipanggil terhadap drizzle client.
// `vi.hoisted` agar state tersedia di dalam factory `vi.mock` yang di-hoist.
const { insertCalls, forbidden } = vi.hoisted(() => ({
  insertCalls: [] as unknown[],
  forbidden: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: (table: unknown) => {
      insertCalls.push(table);
      return { values: async () => undefined };
    },
    update: forbidden,
    delete: forbidden,
  },
}));

// Hindari dependency runtime (logger / request-context) yang berat di unit test.
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/observability/request-context", () => ({
  getActor: () => null,
  getRequestId: () => null,
}));

import * as auditModule from "@/lib/observability/audit";

describe("audit module is append-only (§8.2)", () => {
  it("tidak meng-export fungsi update/delete apa pun", () => {
    const exportedNames = Object.keys(auditModule);
    const mutating = exportedNames.filter((name) =>
      /update|delete|remove|destroy|purge|edit/i.test(name),
    );
    expect(mutating).toEqual([]);
  });

  it("hanya meng-export writer berbasis insert (auditLog/logSystemEvent + async)", () => {
    expect(typeof auditModule.auditLog).toBe("function");
    expect(typeof auditModule.auditLogAsync).toBe("function");
    expect(typeof auditModule.logSystemEvent).toBe("function");
    expect(typeof auditModule.logSystemEventAsync).toBe("function");
  });

  it("auditLog memakai db.insert dan tidak pernah menyentuh db.update/db.delete", async () => {
    insertCalls.length = 0;
    forbidden.mockClear();

    await auditModule.auditLog({ action: "config.update" });

    expect(insertCalls.length).toBe(1);
    expect(forbidden).not.toHaveBeenCalled();
  });

  it("logSystemEvent memakai db.insert dan tidak pernah menyentuh db.update/db.delete", async () => {
    insertCalls.length = 0;
    forbidden.mockClear();

    await auditModule.logSystemEvent({
      source: "test",
      level: "info",
      eventType: "unit.test",
      message: "hello",
    });

    expect(insertCalls.length).toBe(1);
    expect(forbidden).not.toHaveBeenCalled();
  });
});
