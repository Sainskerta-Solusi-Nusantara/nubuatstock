import makeWASocket, {
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import type { WASocket } from "@whiskeysockets/baileys";
import { logger } from "@/lib/logger";
import { useDbAuthState } from "./auth-store";

/** Logger khusus Baileys (warn ke atas) — trace/debug WA terlalu bising. */
export const waLogger = logger.child({ mod: "wa-mirae" });

export interface WaHandle {
  sock: WASocket;
  saveCreds: () => Promise<void>;
  /** true kalau sesi sudah ter-pair (creds.registered). */
  registered: boolean;
}

/**
 * Buat socket WhatsApp (Baileys) dengan auth-state dari Postgres.
 *
 * Caller pasang sendiri handler `connection.update` (untuk reconnect / pairing
 * code) dan `messages.upsert`. `creds.update` sudah di-wire ke persist DB.
 * Logika koneksi sengaja minimal di sini; pairing ada di scripts/wa-login.ts,
 * listening ada di lib/whatsapp/ingest-mirae.ts.
 */
export async function createWaSocket(account = "mirae"): Promise<WaHandle> {
  const { state, saveCreds } = await useDbAuthState(account);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, waLogger),
    },
    logger: waLogger,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    browser: ["Nubuat", "Chrome", "120"],
  });

  sock.ev.on("creds.update", saveCreds);

  return { sock, saveCreds, registered: Boolean(state.creds.registered) };
}

/** Ambil kode disconnect dari error Baileys (Boom) secara defensif. */
export function disconnectStatusCode(err: unknown): number | undefined {
  const out = (err as { output?: { statusCode?: number } } | undefined)?.output;
  return out?.statusCode;
}
