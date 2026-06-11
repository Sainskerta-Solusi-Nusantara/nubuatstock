/**
 * Listener WhatsApp Channel Mirae — proses LONG-RUNNING (untuk worker/VPS).
 *
 * Jalankan: npm run wa:listen   (atau: npx tsx --env-file=.env worker/wa-mirae.ts)
 *
 * Prasyarat aktivasi:
 *   1. Sudah pairing nomor bot (scripts/wa-login.ts).
 *   2. Nomor bot sudah follow WhatsApp Channel Mirae.
 *   3. Config `whatsapp.mirae_channel_jid` = JID channel (xxx@newsletter).
 *
 * Tidak bisa di Vercel (serverless tak bisa menahan koneksi WA). DORMANT sampai
 * worker/VPS tersedia. Auto-reconnect; berhenti kalau logged-out (perlu re-pair).
 */
import { DisconnectReason } from "@whiskeysockets/baileys";
import { createWaSocket, disconnectStatusCode, waLogger } from "@/lib/whatsapp/client";
import { startMiraeListener } from "@/lib/whatsapp/ingest-mirae";

async function connect(): Promise<void> {
  const { sock, registered } = await createWaSocket("mirae");
  if (!registered) {
    waLogger.error("Belum ter-pair — jalankan scripts/wa-login.ts dulu.");
    process.exit(1);
  }

  let listenerStarted = false;
  sock.ev.on("connection.update", async (u) => {
    if (u.connection === "open") {
      waLogger.info("wa-mirae: connected");
      if (!listenerStarted) {
        listenerStarted = true;
        await startMiraeListener(sock);
      }
    } else if (u.connection === "close") {
      const code = disconnectStatusCode(u.lastDisconnect?.error);
      if (code === DisconnectReason.loggedOut) {
        waLogger.error("Logged out — perlu pairing ulang. Stop.");
        process.exit(1);
      }
      waLogger.warn({ code }, "wa-mirae: koneksi tertutup, reconnect 5s…");
      setTimeout(() => void connect(), 5000);
    }
  });
}

connect().catch((e) => {
  waLogger.error({ err: (e as Error).message }, "wa-mirae: fatal");
  process.exit(1);
});
