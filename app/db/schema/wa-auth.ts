import { pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { jsonbT, withTimestamps } from "./_base";

/**
 * Auth-state Baileys (sesi WhatsApp bot) yang dipersist ke Postgres.
 *
 * Baileys default menyimpan auth ke file (`useMultiFileAuthState`). Di Nubuat
 * kita simpan ke DB supaya sesi bertahan lintas restart/host (worker bisa
 * dipindah). Isi = `creds` + banyak signal key (pre-keys, sessions, sender-keys),
 * masing-masing satu baris. Diserialisasi pakai `BufferJSON` (Buffer → base64).
 *
 * `account` = namespace per nomor bot (default "mirae") agar bisa multi-akun.
 * DORMANT sampai worker WA jalan + nomor di-pair (lihat scripts/wa-login.ts).
 */
export const waAuthState = pgTable(
  "wa_auth_state",
  {
    account: text("account").notNull().default("mirae"),
    key: text("key").notNull(),
    data: jsonbT<unknown>("data").notNull(),
    ...withTimestamps,
  },
  (t) => [primaryKey({ columns: [t.account, t.key] })],
);
