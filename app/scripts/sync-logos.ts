#!/usr/bin/env tsx
/**
 * scripts/sync-logos.ts
 *
 * Self-host logo emiten ke Vercel Blob (ganti hotlink Google Favicon).
 * Alur per emiten:
 *   1. Tentukan domain: companies.website → parse domain dari logoUrl favicon lama
 *      → DOMAIN_MAP bawaan (fallback emiten populer) → skip kalau tak ada.
 *   2. Ambil logo terbaik: Brandfetch → Clearbit → Google Favicon (fallback).
 *   3. Konversi ke WebP 128x128 (sharp) — kecil, seragam, transparan.
 *   4. Upload ke Vercel Blob: `company-logos/<KODE>.webp` (URL stabil, overwrite).
 *   5. Simpan URL blob ke companies.logoUrl.
 *
 * PERFORMANCE: hasilnya di-serve dari CDN Blob (cache edge) + sudah pre-optimized,
 * jadi tidak bergantung Google lagi dan jauh lebih cepat/andal.
 *
 * Prasyarat: env `BLOB_READ_WRITE_TOKEN` (buat Blob store di Vercel → Storage → Blob).
 *
 * Usage:
 *   npm run logos:sync                 # semua emiten yang punya domain ter-resolve
 *   npm run logos:sync -- BBRI BBCA    # ticker spesifik
 *   FORCE=1 npm run logos:sync         # re-upload walau sudah di blob
 */
import { put } from "@vercel/blob";
import sharp from "sharp";
import { inArray } from "drizzle-orm";
import { db } from "../lib/db";
import { companies } from "../db/schema/companies";

const CONCURRENCY = 6;
// Force re-upload walau sudah self-hosted: via env FORCE=1 ATAU flag --force.
const FORCE = process.env.FORCE === "1" || process.argv.includes("--force");
const BLOB_HOST = "blob.vercel-storage.com";
/** Ukuran logo (px). 256 = lebih tajam/HD dari 128 sebelumnya. */
const LOGO_SIZE = 256;

/** Fallback domain untuk emiten populer (dev lokal tanpa data website Yahoo). */
const DOMAIN_MAP: Record<string, string> = {
  BBRI: "bri.co.id", BBCA: "bca.co.id", BMRI: "bankmandiri.co.id", BBNI: "bni.co.id",
  BRIS: "bankbsi.co.id", TLKM: "telkom.co.id", ASII: "astra.co.id", GOTO: "gotocompany.com",
  ANTM: "antam.com", ADRO: "alamtri.com", MDKA: "merdekacoppergold.com", UNVR: "unilever.co.id",
  INDF: "indofood.com", ICBP: "indofoodcbp.com", PTBA: "ptba.co.id", PGAS: "pgn.co.id",
  KLBF: "kalbe.co.id", UNTR: "unitedtractors.com", SMGR: "sig.id", AMRT: "alfamart.co.id",
};

function resolveDomain(kode: string, website: string | null, logoUrl: string | null): string | null {
  if (website) {
    try {
      return new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace(/^www\./, "");
    } catch {
      /* fall through */
    }
  }
  if (logoUrl) {
    const m = logoUrl.match(/[?&]domain=([^&]+)/);
    if (m?.[1]) return decodeURIComponent(m[1]);
  }
  return DOMAIN_MAP[kode] ?? null;
}

/** Ambil bytes logo terbaik untuk sebuah domain. */
async function fetchLogoBytes(domain: string): Promise<Buffer | null> {
  const candidates = [
    `https://cdn.brandfetch.io/${domain}/w/512/h/512`,
    `https://logo.clearbit.com/${domain}?size=512&format=png`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: "follow" });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.startsWith("image/")) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 100) continue; // skip placeholder kosong
      return buf;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function syncOne(c: { kode: string; website: string | null; logoUrl: string | null }): Promise<"ok" | "skip" | "fail"> {
  if (!FORCE && c.logoUrl?.includes(BLOB_HOST)) return "skip"; // sudah self-hosted
  const domain = resolveDomain(c.kode, c.website, c.logoUrl);
  if (!domain) return "skip";

  const raw = await fetchLogoBytes(domain);
  if (!raw) return "fail";

  const webp = await sharp(raw)
    .resize(LOGO_SIZE, LOGO_SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .webp({ quality: 92 })
    .toBuffer();

  const blob = await put(`company-logos/${c.kode}.webp`, webp, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  await db.update(companies).set({ logoUrl: blob.url }).where(inArray(companies.kode, [c.kode]));
  return "ok";
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌ BLOB_READ_WRITE_TOKEN belum di-set. Buat Blob store di Vercel (Storage → Blob), lalu tambah token ke .env.");
    process.exit(1);
  }

  const argv = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const rows = argv.length
    ? await db.select({ kode: companies.kode, website: companies.website, logoUrl: companies.logoUrl }).from(companies).where(inArray(companies.kode, argv.map((s) => s.toUpperCase())))
    : await db.select({ kode: companies.kode, website: companies.website, logoUrl: companies.logoUrl }).from(companies);

  console.log(`Sync logo untuk ${rows.length} emiten (concurrency ${CONCURRENCY}, FORCE=${FORCE})...`);
  let ok = 0, skip = 0, fail = 0;

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((c) => syncOne(c).catch(() => "fail" as const)));
    for (const r of results) (r === "ok" ? ok++ : r === "skip" ? skip++ : fail++);
    console.log(`  ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length} — ok:${ok} skip:${skip} fail:${fail}`);
  }

  console.log(`Selesai. Berhasil upload: ${ok}, dilewati: ${skip}, gagal (tak ada logo): ${fail}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
