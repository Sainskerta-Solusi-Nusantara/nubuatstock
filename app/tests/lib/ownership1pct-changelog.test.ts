import { describe, expect, it } from "vitest";

import {
  extractChangelog,
  extractChangelogAll,
  type ChangelogData,
} from "@/lib/ownership1pct/fetch";

/**
 * Unit tests untuk parser PURE `extractChangelogAll()` & `extractChangelog()` di
 * lib/ownership1pct/fetch.ts. Tanpa network: kita bangun HTML sintetis yang
 * meniru RSC flight payload Next.js — `self.__next_f.push([n,"<escaped-json>"])`.
 *
 * Inti yang diuji: payload disisipkan sebagai STRING JSON (ter-escape). Helper
 * `pushPayload` memakai JSON.stringify untuk meng-escape persis seperti output
 * Next.js, supaya joinPayload bisa JSON.parse-nya kembali.
 */

/** Bungkus string payload mentah jadi satu statement self.__next_f.push(...). */
function pushPayload(seq: number, payload: string): string {
  // JSON.stringify menghasilkan string ter-quote + ter-escape (mis. " → \").
  return `<script>self.__next_f.push([${seq},${JSON.stringify(payload)}])</script>`;
}

/** Bangun HTML lengkap dari beberapa potongan payload (disambung joinPayload). */
function buildHtml(payloadChunks: string[]): string {
  const scripts = payloadChunks
    .map((chunk, i) => pushPayload(i, chunk))
    .join("\n");
  return `<!DOCTYPE html><html><head></head><body><div id="app"></div>${scripts}</body></html>`;
}

const PERIODS = [
  { currentDate: "2026-06-01", prevDate: "2026-05-31", added: 12, removed: 3 },
  { currentDate: "2026-05-31", prevDate: "2026-05-30", added: 7, removed: 5 },
  { currentDate: "2026-05-30", prevDate: "2026-05-29", added: 2, removed: 9 },
];

describe("extractChangelogAll", () => {
  it("mengembalikan SEMUA periode dari payload tunggal", () => {
    const html = buildHtml([`a:["$","div",null,{}]\n2:` + JSON.stringify(PERIODS)]);
    const all = extractChangelogAll(html);
    expect(all).toHaveLength(3);
    expect(all.map((c) => c.currentDate)).toEqual([
      "2026-06-01",
      "2026-05-31",
      "2026-05-30",
    ]);
    expect(all[0]!.prevDate).toBe("2026-05-31");
    expect(all[0]!.added).toBe(12);
  });

  it("bekerja saat payload terpecah di beberapa push() (disambung)", () => {
    const fullJson = JSON.stringify(PERIODS);
    const mid = Math.floor(fullJson.length / 2);
    const html = buildHtml([
      'b:["$","main",null,{}]\nX:' + fullJson.slice(0, mid),
      fullJson.slice(mid) + "\nY:done",
    ]);
    const all = extractChangelogAll(html);
    expect(all).toHaveLength(3);
    expect(all.map((c) => c.currentDate)).toEqual(
      PERIODS.map((p) => p.currentDate),
    );
  });

  it("menangani escaping kutip di dalam payload (issuer name dgn quote)", () => {
    const periods: ChangelogData[] = [
      { currentDate: "2026-06-01", note: 'PT "Maju" Tbk' },
      { currentDate: "2026-05-31", note: "biasa" },
    ];
    const html = buildHtml(["z:" + JSON.stringify(periods)]);
    const all = extractChangelogAll(html);
    expect(all).toHaveLength(2);
    expect(all[0]!.note).toBe('PT "Maju" Tbk');
  });

  it("filter entri tanpa currentDate string yang valid", () => {
    // Array berisi satu objek valid + satu objek tanpa currentDate.
    const mixed = [
      { currentDate: "2026-06-01", ok: true },
      { prevDate: "2026-05-31" }, // tidak punya currentDate → dibuang
    ];
    const html = buildHtml(["m:" + JSON.stringify(mixed)]);
    const all = extractChangelogAll(html);
    expect(all).toHaveLength(1);
    expect(all[0]!.currentDate).toBe("2026-06-01");
  });

  it("mengembalikan [] bila tidak ada marker currentDate", () => {
    const html = buildHtml(['n:["$","div",null,{"className":"x"}]']);
    expect(extractChangelogAll(html)).toEqual([]);
  });

  it("mengembalikan [] untuk HTML tanpa self.__next_f sama sekali", () => {
    expect(extractChangelogAll("<html><body>kosong</body></html>")).toEqual([]);
  });
});

describe("extractChangelog", () => {
  it("mengembalikan periode PERTAMA (terbaru) saja", () => {
    const html = buildHtml(["q:" + JSON.stringify(PERIODS)]);
    const first = extractChangelog(html);
    expect(first).not.toBeNull();
    expect(first?.currentDate).toBe("2026-06-01");
    expect(first?.prevDate).toBe("2026-05-31");
  });

  it("mengembalikan null bila tidak ada periode", () => {
    expect(extractChangelog("<html></html>")).toBeNull();
  });
});
