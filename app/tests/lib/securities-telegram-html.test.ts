import { describe, expect, it } from "vitest";

import { htmlToText } from "@/lib/securities/telegram";

/**
 * Unit tests untuk bagian PURE `htmlToText()` di lib/securities/telegram.ts.
 * Fokus: decode entitas HTML (named + numeric desimal + numeric hex), strip tag,
 * dan <br> → newline. Tanpa network (fetchTelegramMessages di-skip — butuh fetch).
 */
describe("htmlToText", () => {
  it("strip tag HTML biasa", () => {
    expect(htmlToText("<b>BBRI</b> trading <i>buy</i>")).toBe("BBRI trading buy");
  });

  it("ubah <br> (semua varian) jadi newline", () => {
    expect(htmlToText("baris1<br>baris2")).toBe("baris1\nbaris2");
    expect(htmlToText("baris1<br/>baris2")).toBe("baris1\nbaris2");
    expect(htmlToText("baris1<br />baris2")).toBe("baris1\nbaris2");
    expect(htmlToText("baris1<BR>baris2")).toBe("baris1\nbaris2");
  });

  it("decode entitas named umum", () => {
    expect(htmlToText("PT A &amp; B")).toBe("PT A & B");
    expect(htmlToText("&lt;tag&gt;")).toBe("<tag>");
    expect(htmlToText("kata &quot;penting&quot;")).toBe('kata "penting"');
    expect(htmlToText("a&nbsp;b")).toBe("a b");
  });

  it("decode apostrof: &#39; / &#039; / &#x27;", () => {
    expect(htmlToText("it&#39;s")).toBe("it's");
    expect(htmlToText("it&#039;s")).toBe("it's");
    expect(htmlToText("it&#x27;s")).toBe("it's");
    expect(htmlToText("it&#X27;s")).toBe("it's"); // hex case-insensitive
  });

  it("decode numeric desimal generik (&#NNN;)", () => {
    // 8377 = ₹ (rupee sign), 233 = é
    expect(htmlToText("&#233;")).toBe("é");
    expect(htmlToText("caf&#233;")).toBe("café");
  });

  it("decode numeric hex generik (&#xHH;)", () => {
    // 0xE9 = é, 0x2122 = ™
    expect(htmlToText("caf&#xe9;")).toBe("café");
    expect(htmlToText("brand&#x2122;")).toBe("brand™");
  });

  it("kombinasi tag + entitas + br pada pesan realistis", () => {
    const html =
      '<a href="x">BBRI</a> Trading Buy<br>Entry 4.200&nbsp;&amp; target 4.500<br/>SL &lt;4.000';
    expect(htmlToText(html)).toBe(
      "BBRI Trading Buy\nEntry 4.200 & target 4.500\nSL <4.000",
    );
  });

  it("teks polos tanpa HTML dikembalikan apa adanya", () => {
    expect(htmlToText("hanya teks biasa")).toBe("hanya teks biasa");
  });

  it("string kosong", () => {
    expect(htmlToText("")).toBe("");
  });
});
