import type { WAMessage, WASocket } from "@whiskeysockets/baileys";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import { extractPicksFromText } from "@/lib/securities-picks/fetch";
import { addSecuritiesPick } from "@/lib/securities-picks/service";

/**
 * Ingest Daily Picks Mirae dari WhatsApp Channel → SINYAL INTERNAL.
 *
 * KEBIJAKAN (lihat memory project_securities_picks): hasilnya disimpan ke
 * `securities_picks` dengan label internal & TIDAK ditampilkan verbatim ke user
 * (tabel itu sudah superadmin-only). Tujuannya jadi input internal, bukan
 * rebroadcast "Rekomendasi Mirae". Risiko legal & ban → nomor khusus.
 *
 * DORMANT: butuh worker persisten + nomor ter-pair + JID channel di config.
 */

/** Label sumber internal (bukan "Mirae Asset Sekuritas" murni agar jelas ini sinyal internal). */
const INTERNAL_LABEL = "Mirae Asset (WA · internal)";

/** Detik epoch dari messageTimestamp Baileys (number | Long | undefined). */
function toSeconds(ts: unknown): number {
  if (typeof ts === "number") return ts;
  const asLong = ts as { toNumber?: () => number } | null | undefined;
  if (asLong && typeof asLong.toNumber === "function") return asLong.toNumber();
  return Number(ts ?? 0);
}

/** Tanggal WIB (YYYY-MM-DD) dari epoch detik pesan. */
function wibDate(ts: unknown): string {
  const ms = toSeconds(ts) * 1000;
  const d = ms > 0 ? new Date(ms) : new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Ambil teks dari WAMessage (conversation / extended text / caption). */
export function extractTextFromWAMessage(msg: WAMessage): string | null {
  const m = msg.message;
  if (!m) return null;
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    null
  );
}

/**
 * Proses satu teks pesan channel → ekstrak picks (DeepSeek) → upsert internal.
 * Idempoten (unique pickDate+securities+kode). Return jumlah pick tersimpan.
 */
export async function ingestMiraeText(text: string, ts: unknown): Promise<number> {
  if (!text || text.trim().length < 8) return 0;
  const pickDate = wibDate(ts);
  let rows;
  try {
    rows = await extractPicksFromText(text, {
      securities: INTERNAL_LABEL,
      pickDate,
      sourceUrl: null, // internal: tidak menautkan sumber WA
    });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "wa-mirae: ekstraksi AI gagal");
    return 0;
  }
  let saved = 0;
  for (const row of rows) {
    try {
      await addSecuritiesPick(row);
      saved++;
    } catch (err) {
      logger.warn({ err: (err as Error).message, kode: row.kode }, "wa-mirae: upsert gagal");
    }
  }
  if (saved > 0) logger.info({ pickDate, saved }, "wa-mirae: picks internal tersimpan");
  return saved;
}

/**
 * Pasang listener pesan channel Mirae pada socket yang sudah konek.
 * JID channel diambil dari config `whatsapp.mirae_channel_jid` (format
 * `xxxxxxxxxx@newsletter`). Tanpa JID → no-op (cuma warning).
 */
export async function startMiraeListener(sock: WASocket): Promise<void> {
  const jid = await getConfig<string>("whatsapp.mirae_channel_jid", { defaultValue: "" });
  if (!jid) {
    logger.warn("wa-mirae: whatsapp.mirae_channel_jid belum di-set — listener idle");
    return;
  }

  // Subscribe live updates channel (best-effort).
  try {
    await sock.subscribeNewsletterUpdates(jid);
    logger.info({ jid }, "wa-mirae: subscribed newsletter updates");
  } catch (err) {
    logger.warn({ err: (err as Error).message, jid }, "wa-mirae: subscribe gagal (lanjut listen)");
  }

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key?.remoteJid !== jid) continue;
      const text = extractTextFromWAMessage(msg);
      if (!text) continue;
      await ingestMiraeText(text, msg.messageTimestamp);
    }
  });

  logger.info({ jid }, "wa-mirae: listener aktif");
}
