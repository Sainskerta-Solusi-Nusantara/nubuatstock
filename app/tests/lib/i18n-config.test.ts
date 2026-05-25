import { describe, expect, it } from "vitest";

/**
 * Tests untuk `lib/i18n/config.ts` — locale resolution priority:
 *   user.locale → cookie → accept-language → default
 */
describe("lib/i18n/config", () => {
  it("exposes supported locales & default", async () => {
    const m = await import("@/lib/i18n/config");
    expect(m.SUPPORTED_LOCALES).toEqual(["id", "en"]);
    expect(m.DEFAULT_LOCALE).toEqual("id");
  });

  it("isSupportedLocale validates correctly", async () => {
    const m = await import("@/lib/i18n/config");
    expect(m.isSupportedLocale("id")).toEqual(true);
    expect(m.isSupportedLocale("en")).toEqual(true);
    expect(m.isSupportedLocale("fr")).toEqual(false);
    expect(m.isSupportedLocale("")).toEqual(false);
  });

  it("normalizeLocale converts 'id-ID' → 'id'", async () => {
    const m = await import("@/lib/i18n/config");
    expect(m.normalizeLocale("id-ID")).toEqual("id");
    expect(m.normalizeLocale("en-US")).toEqual("en");
    expect(m.normalizeLocale("xx-YY")).toEqual("id"); // fallback
  });

  it("pickLocale prefers user → cookie → header → default", async () => {
    const m = await import("@/lib/i18n/config");
    expect(
      m.pickLocale({ userLocale: "en", cookieLocale: "id", header: "id-ID" }),
    ).toEqual("en");
    expect(m.pickLocale({ cookieLocale: "en", header: "id-ID" })).toEqual("en");
    expect(m.pickLocale({ header: "id-ID,en;q=0.7" })).toEqual("id");
    expect(m.pickLocale({})).toEqual("id");
  });
});
