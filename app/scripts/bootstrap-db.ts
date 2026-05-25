import postgres from "postgres";
import { BOOTSTRAP_SQL } from "../db/schema/_base";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = postgres(url, { max: 1, prepare: false });
  await sql.unsafe(BOOTSTRAP_SQL);
  console.log("✓ BOOTSTRAP_SQL applied (extensions, gen_ulid, set_updated_at)");
  await sql.end();
}

main().catch((e) => {
  console.error("✗ Bootstrap failed:", e.message);
  process.exit(1);
});
