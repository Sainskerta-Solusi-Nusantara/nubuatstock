/**
 * One-off: tandai SEMUA user existing sebagai emailVerified=true (grandfather).
 * Perlu karena gate email-verification baru me-redirect user `emailVerified=false`
 * ke /verify-email — akun lama (founder/test) jadi terkunci. Signup BARU tetap
 * wajib verifikasi (gate tetap aktif). Jalankan juga di PROD sekali sebelum deploy.
 *   npx tsx --env-file=.env db/grandfather-verify.ts
 */
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "./schema/auth";

async function main() {
  const res = await db
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.emailVerified, false));
  console.log("Grandfathered existing users → emailVerified=true:", res);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
