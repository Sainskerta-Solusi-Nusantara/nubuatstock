import { describe, expect, it } from "vitest";

/**
 * Tests untuk `lib/notifications/render.ts`.
 *
 * Renderer di-test secara isolated tanpa DB — kita pakai fungsi
 * `applyTemplate(template, vars)` yang exported untuk unit testing.
 */
describe("lib/notifications/render", () => {
  it("substitutes simple {{var}} placeholders", async () => {
    const { applyTemplate } = await import("@/lib/notifications/render");
    const out = applyTemplate("Halo {{name}}!", { name: "Andi" }, { isHtml: false });
    expect(out).toEqual("Halo Andi!");
  });

  it("escapes HTML when isHtml = true", async () => {
    const { applyTemplate } = await import("@/lib/notifications/render");
    const out = applyTemplate("<p>{{msg}}</p>", { msg: "<script>x</script>" }, { isHtml: true });
    expect(out).toContain("&lt;script&gt;");
    expect(out).not.toContain("<script>");
  });

  it("does not escape when isHtml = false", async () => {
    const { applyTemplate } = await import("@/lib/notifications/render");
    const out = applyTemplate("{{a}}<b>", { a: "<x>" }, { isHtml: false });
    expect(out).toEqual("<x><b>");
  });

  it("throws when declared variable missing", async () => {
    const { applyTemplate } = await import("@/lib/notifications/render");
    expect(() =>
      applyTemplate("{{name}}", {}, { isHtml: false, requiredVars: ["name"] }),
    ).toThrow();
  });

  it("ignores extra variables not in template", async () => {
    const { applyTemplate } = await import("@/lib/notifications/render");
    const out = applyTemplate("hi {{x}}", { x: "1", y: "ignored" }, { isHtml: false });
    expect(out).toEqual("hi 1");
  });
});
