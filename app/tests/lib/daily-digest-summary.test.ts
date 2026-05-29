import { describe, expect, it } from "vitest";
import type { DigestSectorMover } from "@/db/schema/daily-digest";
import {
  DIGEST_DISCLAIMER,
  SUMMARY_SYSTEM_PROMPT,
  buildSummaryPrompt,
  ensureDisclaimer,
  ruleBasedSummary,
  type SummaryPromptInput,
} from "@/lib/daily-digest/generator";

/**
 * Unit tests untuk "Ringkasan Pasar Hari Ini" (AI Auto-Summary Daily).
 *
 * Fokus ke logika PURE (tanpa DB / tanpa jaringan LLM):
 *  - buildSummaryPrompt  → penyusunan prompt deterministik.
 *  - ensureDisclaimer    → disclaimer wajib selalu hadir, tanpa duplikasi.
 *  - ruleBasedSummary    → fallback rule-based saat LLM gagal/tidak dikonfigurasi.
 *
 * DILEWATI (butuh DB/Redis/LLM, di luar scope file ini):
 *  - generateDailyDigest / getLatestDigest (query db, panggil client AI).
 */

const sectorMovers: DigestSectorMover[] = [
  { sectorKode: "FIN", sectorName: "Keuangan", returnPct: 1.2, topGainerKode: "BBCA" },
  { sectorKode: "ENRG", sectorName: "Energi", returnPct: -0.8, topGainerKode: null },
];

function makeInput(overrides: Partial<SummaryPromptInput["context"]> = {}): SummaryPromptInput {
  return {
    context: {
      ihsgReturn1d: 0.65,
      bullishSectors: 7,
      bearishSectors: 4,
      topGainerSector: "Keuangan",
      topLoserSector: "Energi",
      bullishNewsCount: 12,
      bearishNewsCount: 5,
      ...overrides,
    },
    sectorMovers,
    topPicksCount: 3,
    topNewsCount: 5,
  };
}

describe("buildSummaryPrompt", () => {
  it("menghasilkan dua pesan: system + user dengan nada 'kamu'", () => {
    const messages = buildSummaryPrompt(makeInput());
    expect(messages).toHaveLength(2);
    const [system, user] = messages;
    expect(system?.role).toBe("system");
    expect(system?.content).toBe(SUMMARY_SYSTEM_PROMPT);
    expect(user?.role).toBe("user");
    // Nada "kamu", bukan "Anda".
    expect(SUMMARY_SYSTEM_PROMPT).toMatch(/kamu/i);
    expect(SUMMARY_SYSTEM_PROMPT).toMatch(/3-5 kalimat/);
  });

  it("menyisipkan angka context (IHSG, sektor, news, picks) ke prompt", () => {
    const messages = buildSummaryPrompt(makeInput());
    const user = messages[1]?.content ?? "";
    expect(user).toContain("0.65%");
    expect(user).toContain("Sektor bullish: 7");
    expect(user).toContain("bearish: 4");
    expect(user).toContain("Top sektor gainer: Keuangan");
    expect(user).toContain("Top sektor loser: Energi");
    expect(user).toContain("12 bullish, 5 bearish");
    expect(user).toContain("Daily Picks aktif: 3");
    expect(user).toContain("Berita penting terpilih: 5");
  });

  it("menangani IHSG null tanpa crash", () => {
    const messages = buildSummaryPrompt(makeInput({ ihsgReturn1d: null }));
    expect(messages[1]?.content ?? "").toContain("proxy weighted by market cap): —");
  });

  it("meminta JSON dan melarang disclaimer di dalam summary", () => {
    const user = buildSummaryPrompt(makeInput())[1]?.content ?? "";
    expect(user).toMatch(/HANYA JSON/);
    expect(user).toMatch(/headline/);
    expect(user).toMatch(/summary/);
    expect(user).toMatch(/sistem akan menambahkannya otomatis/);
  });
});

describe("ensureDisclaimer", () => {
  it("menambahkan disclaimer kalau belum ada", () => {
    const out = ensureDisclaimer("Pasar menguat hari ini.");
    expect(out).toContain(DIGEST_DISCLAIMER);
    expect(out.startsWith("Pasar menguat hari ini.")).toBe(true);
  });

  it("tidak menduplikasi disclaimer yang sudah ada", () => {
    const withDisc = `Pasar menguat. ${DIGEST_DISCLAIMER}`;
    const out = ensureDisclaimer(withDisc);
    const occurrences = out.split(DIGEST_DISCLAIMER).length - 1;
    expect(occurrences).toBe(1);
  });

  it("menambahkan pemisah titik kalau teks tidak diakhiri tanda baca", () => {
    const out = ensureDisclaimer("Pasar menguat hari ini");
    expect(out).toContain("hari ini. " + DIGEST_DISCLAIMER);
  });

  it("menangani string kosong", () => {
    expect(ensureDisclaimer("")).toBe(DIGEST_DISCLAIMER);
    expect(ensureDisclaimer("   ")).toBe(DIGEST_DISCLAIMER);
  });
});

describe("ruleBasedSummary (fallback tanpa AI)", () => {
  it("menghasilkan headline + summary yang tidak kosong dengan disclaimer", () => {
    const { headline, summary } = ruleBasedSummary(makeInput());
    expect(headline.length).toBeGreaterThan(0);
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain(DIGEST_DISCLAIMER);
  });

  it("mencerminkan arah pasar menguat", () => {
    const { headline, summary } = ruleBasedSummary(makeInput({ ihsgReturn1d: 1.5 }));
    expect(headline).toContain("menguat");
    expect(headline).toContain("+1.50%");
    expect(summary).toContain("menguat");
  });

  it("mencerminkan arah pasar melemah", () => {
    const { headline, summary } = ruleBasedSummary(makeInput({ ihsgReturn1d: -1.5 }));
    expect(headline).toContain("melemah");
    expect(summary).toContain("melemah");
  });

  it("menyebut jumlah Daily Picks ketika ada", () => {
    const { summary } = ruleBasedSummary({ ...makeInput(), topPicksCount: 4 });
    expect(summary).toContain("4 Daily Picks");
  });

  it("menyebut tidak ada Daily Picks ketika kosong", () => {
    const { summary } = ruleBasedSummary({ ...makeInput(), topPicksCount: 0 });
    expect(summary).toContain("Belum ada Daily Picks");
  });

  it("menyebut sentimen berita bullish vs bearish", () => {
    const { summary } = ruleBasedSummary(makeInput());
    expect(summary).toContain("12 bullish vs 5 bearish");
  });

  it("menangani IHSG null tanpa crash", () => {
    const { headline, summary } = ruleBasedSummary(makeInput({ ihsgReturn1d: null }));
    expect(headline).toContain("campuran");
    expect(summary).toContain(DIGEST_DISCLAIMER);
  });
});
