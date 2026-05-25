#!/usr/bin/env tsx
/**
 * scripts/fetch-emiten.ts
 *
 * Fetch lengkap daftar emiten BEI dari sumber publik & simpan ke
 * `db/seed/data/emiten.json`. Snapshot di-commit (data faktual publik).
 * Seed companies (Agent 2) baca dari snapshot ini.
 *
 * Source priority:
 *   1. KSEI registered-securities/shares  (paling authoritative — custodian level)
 *   2. Kontan emiten.kontan.co.id          (fallback dengan pagination)
 *
 * Usage:
 *   npx tsx scripts/fetch-emiten.ts                # default: KSEI lalu fallback Kontan
 *   npx tsx scripts/fetch-emiten.ts --source=ksei
 *   npx tsx scripts/fetch-emiten.ts --source=kontan
 *   npx tsx scripts/fetch-emiten.ts --dry           # log count tanpa write
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

interface EmitenRecord {
  kode: string;
  nama: string;
  source: string;
  fetchedAt: string;
  // Future optional fields:
  registrar?: string;       // KSEI only
  nominal?: string;         // KSEI only
  listingDate?: string;     // Kontan only
  papan?: string;
  sector?: string;
}

const OUT_PATH = resolve(process.cwd(), "db/seed/data/emiten.json");

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function httpGet(url: string, attempts = 3): Promise<string | null> {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return await res.text();
      console.warn(`[http] ${url} HTTP ${res.status}, attempt ${i}/${attempts}`);
    } catch (err) {
      console.warn(`[http] ${url} error: ${(err as Error).message}, attempt ${i}/${attempts}`);
    }
    if (i < attempts) await sleep(1500 * i);
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────
 * SOURCE 1: KSEI
 *   URL: https://web.ksei.co.id/services/registered-securities/shares
 *   Format: HTML table 4 kolom (No, Kode, Deskripsi, Biro Adm Efek, Nominal)
 *   Pattern row: link <a href="/services/registered-securities/shares/lc/{KODE}">{KODE}</a>
 *               + adjacent <td>{nama}</td> + ...
 * ──────────────────────────────────────────────────────────────────── */

const KSEI_URL = "https://web.ksei.co.id/services/registered-securities/shares";

async function fetchFromKSEI(): Promise<EmitenRecord[]> {
  console.log(`[ksei] Fetching ${KSEI_URL}`);
  const html = await httpGet(KSEI_URL);
  if (!html) {
    console.error("[ksei] Gagal fetch — kemungkinan diblok atau timeout.");
    return [];
  }

  // KSEI URL pattern: /services/registered-securities/shares/lc/{KODE}
  // Strategi: extract row via regex capturing ticker code + adjacent <td> dengan nama.
  // Toleransi terhadap variasi whitespace & atribut.
  const records = new Map<string, EmitenRecord>();
  const now = new Date().toISOString();

  // Pattern 1: link kode + cell selanjutnya berisi nama
  // Contoh: <a href="...shares/lc/AALI">AALI</a></td><td>Astra Agro Lestari Tbk.</td>
  const linkPattern = /href=["']\/services\/registered-securities\/shares\/lc\/([A-Z][A-Z0-9]{2,5})["'][^>]*>[^<]*<\/a>\s*<\/td>\s*<td[^>]*>([^<]+)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkPattern.exec(html))) {
    const kode = m[1]!.toUpperCase();
    const nama = decodeHtmlEntities(m[2]!.trim());
    if (!isValidTicker(kode) || records.has(kode)) continue;
    records.set(kode, { kode, nama, source: "ksei.co.id", fetchedAt: now });
  }

  // Pattern 2: fallback — text "KODE Nama Perusahaan Tbk." dalam row
  if (records.size < 100) {
    console.log(`[ksei] Pattern 1 hanya ${records.size}, mencoba pattern 2 (loose)`);
    const loose = /<td[^>]*>\s*(?:<a[^>]*>)?([A-Z][A-Z0-9]{2,5})(?:<\/a>)?\s*<\/td>\s*<td[^>]*>([^<]+?Tbk\.?)\s*<\/td>/gi;
    while ((m = loose.exec(html))) {
      const kode = m[1]!.toUpperCase();
      const nama = decodeHtmlEntities(m[2]!.trim());
      if (!isValidTicker(kode) || records.has(kode)) continue;
      records.set(kode, { kode, nama, source: "ksei.co.id", fetchedAt: now });
    }
  }

  console.log(`[ksei] Total ${records.size} emiten`);
  return Array.from(records.values());
}

/* ────────────────────────────────────────────────────────────────────
 * SOURCE 2: Kontan
 *   URL: https://emiten.kontan.co.id/daftar-emiten?page=N
 *   Pagination: 1..200+
 * ──────────────────────────────────────────────────────────────────── */

const KONTAN_BASE = "https://emiten.kontan.co.id/daftar-emiten";

async function fetchFromKontan(): Promise<EmitenRecord[]> {
  console.log(`[kontan] Mulai pagination scrape dari ${KONTAN_BASE}`);
  const records = new Map<string, EmitenRecord>();
  const now = new Date().toISOString();
  const maxPages = 300;
  let consecutiveEmpty = 0;

  for (let page = 1; page <= maxPages; page++) {
    const html = await httpGet(`${KONTAN_BASE}?page=${page}`);
    if (!html) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= 3) break;
      continue;
    }

    const patterns: RegExp[] = [
      /<h[1-4][^>]*>\s*([^<(]+?)\s*\(([A-Z][A-Z0-9]{2,5})\)\s*<\/h[1-4]>/gi,
      /<a[^>]*>\s*([^<(]+?)\s*\(([A-Z][A-Z0-9]{2,5})\)\s*<\/a>/gi,
      /([A-Z][\w &.,'/-]{3,80}?\s+Tbk\.?)\s*\(([A-Z][A-Z0-9]{2,5})\)/g,
    ];

    let added = 0;
    for (const re of patterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html))) {
        const nama = decodeHtmlEntities(m[1]!.replace(/\s+/g, " ").trim());
        const kode = m[2]!.toUpperCase();
        if (!isValidTicker(kode) || records.has(kode)) continue;
        records.set(kode, { kode, nama, source: "kontan.co.id", fetchedAt: now });
        added++;
      }
    }

    if (added === 0) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= 5) break;
    } else {
      consecutiveEmpty = 0;
      console.log(`[kontan] page ${page}: +${added} (total ${records.size})`);
    }

    await sleep(120);
  }

  console.log(`[kontan] Total ${records.size} emiten`);
  return Array.from(records.values());
}

/* ────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────── */

function isValidTicker(code: string): boolean {
  return /^[A-Z][A-Z0-9]{2,4}$/.test(code);
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ────────────────────────────────────────────────────────────────────
 * Main
 * ──────────────────────────────────────────────────────────────────── */

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const sourceArg = args.find((a) => a.startsWith("--source="))?.split("=")[1] ?? "auto";

  let records: EmitenRecord[] = [];
  let primarySource = "";

  if (sourceArg === "ksei" || sourceArg === "auto") {
    records = await fetchFromKSEI();
    primarySource = "ksei.co.id";
    if (records.length < 100 && sourceArg === "auto") {
      console.log("[main] KSEI menghasilkan <100 entries, fallback ke Kontan.");
      records = await fetchFromKontan();
      primarySource = "kontan.co.id";
    }
  } else if (sourceArg === "kontan") {
    records = await fetchFromKontan();
    primarySource = "kontan.co.id";
  } else {
    console.error(`Unknown --source=${sourceArg}. Pilihan: ksei | kontan | auto`);
    process.exit(1);
  }

  if (records.length === 0) {
    console.error("[main] FATAL: tidak ada emiten ter-fetch. Cek koneksi atau pattern HTML berubah.");
    process.exit(1);
  }

  if (records.length < 100) {
    console.warn(`[main] WARNING: hanya ${records.length} emiten (expected ~900+). HTML structure mungkin berubah — periksa pattern parser.`);
  }

  records.sort((a, b) => a.kode.localeCompare(b.kode));

  if (dry) {
    console.log(`[main] DRY RUN: ${records.length} emiten, primary source ${primarySource}.`);
    console.log("Sample 10:");
    for (const r of records.slice(0, 10)) {
      console.log(`  ${r.kode} — ${r.nama}`);
    }
    return;
  }

  const payload = {
    totalCount: records.length,
    fetchedAt: new Date().toISOString(),
    primarySource,
    records,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`[main] ✓ Snapshot tersimpan: ${OUT_PATH}`);
  console.log(`[main] ✓ Total: ${records.length} emiten dari ${primarySource}`);
}

main().catch((err) => {
  console.error("[main] FATAL:", err);
  process.exit(1);
});
