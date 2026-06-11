/**
 * Pairing SEKALI nomor WhatsApp bot Nubuat (untuk ingest sinyal Mirae).
 *
 * Jalankan (perlu nomor bot yang WhatsApp-nya aktif di HP):
 *   npx tsx --env-file=.env scripts/wa-login.ts [nomor]
 *
 * Default nomor = 6281284190511. Script akan cetak KODE PAIRING 8-karakter.
 * Di HP bot: WhatsApp → Setelan → Perangkat Tertaut → Tautkan perangkat →
 * "Tautkan dengan nomor telepon" → masukkan kode. Sesi tersimpan ke Postgres
 * (tabel wa_auth_state), jadi tak perlu diulang kecuali logout.
 */
import { DisconnectReason } from "@whiskeysockets/baileys";
import { createWaSocket, disconnectStatusCode } from "@/lib/whatsapp/client";

const DEFAULT_NUMBER = "6281284190511";

async function main() {
  const number = (process.argv[2] || process.env.WA_BOT_NUMBER || DEFAULT_NUMBER).replace(/\D/g, "");
  const { sock } = await createWaSocket("mirae");

  if (sock.authState.creds.registered) {
    console.log("✅ Sesi sudah ter-pair. Tidak perlu login ulang.");
    process.exit(0);
  }

  sock.ev.on("connection.update", (u) => {
    if (u.connection === "open") {
      console.log("\n✅ Tersambung & ter-pair. Sesi tersimpan ke DB.");
      console.log("Langkah berikutnya: follow WhatsApp Channel Mirae dari nomor bot,");
      console.log("lalu set config `whatsapp.mirae_channel_jid` ke JID channel (xxx@newsletter).");
      setTimeout(() => process.exit(0), 1500);
    } else if (u.connection === "close") {
      const code = disconnectStatusCode(u.lastDisconnect?.error);
      console.log("Koneksi tertutup, code:", code, code === DisconnectReason.restartRequired ? "(restart — jalankan ulang)" : "");
      process.exit(code === DisconnectReason.loggedOut ? 1 : 0);
    }
  });

  // Minta pairing code setelah socket siap.
  setTimeout(async () => {
    try {
      const code = await sock.requestPairingCode(number);
      const pretty = code?.match(/.{1,4}/g)?.join("-") ?? code;
      console.log(`\n📲 Kode pairing untuk +${number}: ${pretty}`);
      console.log("Masukkan di WhatsApp bot: Setelan → Perangkat Tertaut → Tautkan dengan nomor telepon.");
    } catch (e) {
      console.error("Gagal minta pairing code:", (e as Error).message);
      process.exit(1);
    }
  }, 3000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
