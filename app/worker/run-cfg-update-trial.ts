import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Samakan konfigurasi trial ke 1 HARI di app_config (prod):
 *  - trial.duration_days = 1
 *  - Teks landing yang memuat "7 hari"/"7 Hari" → "1 hari"/"1 Hari"
 *    (hanya key landing trial-context yang sudah diverifikasi).
 *
 *   npx tsx --env-file=.env worker/run-cfg-update-trial.ts
 */

const LANDING_KEYS = [
  "landing.hero.cta_note",
  "landing.hero.cta_primary",
  "landing.how.steps",
  "landing.trial.headline",
  "landing.trial.inclusions",
  "landing.faq.items",
];

async function main() {
  // 1) Durasi trial → 1 hari
  await db.execute(
    sql.raw("update app_config set value = '1'::jsonb, updated_at = now() where key = 'trial.duration_days'"),
  );
  console.log("trial.duration_days → 1");

  // 2) Ganti '7 hari'/'7 Hari' di value JSON landing
  for (const key of LANDING_KEYS) {
    const r = await db.execute(
      sql.raw(
        `update app_config
         set value = replace(replace(value::text, '7 hari', '1 hari'), '7 Hari', '1 Hari')::jsonb,
             updated_at = now()
         where key = '${key}'`,
      ),
    );
    console.log(`updated ${key}`);
  }

  // 3) Verifikasi
  const r = await db.execute(
    sql.raw(
      "select key, value::text as value from app_config where key = 'trial.duration_days' or key = any(array['landing.hero.cta_primary','landing.trial.headline']) order by key",
    ),
  );
  console.log("\n=== VERIFIKASI ===");
  for (const x of r as unknown as Array<{ key: string; value: string }>) {
    console.log(`${x.key} = ${x.value.slice(0, 90)}`);
  }
  // Pastikan tak ada sisa '7 hari' di landing trial keys
  const leftover = await db.execute(
    sql.raw(
      `select key from app_config where key = any(array[${LANDING_KEYS.map((k) => `'${k}'`).join(",")}]) and value::text ilike '%7 hari%'`,
    ),
  );
  const left = leftover as unknown as Array<{ key: string }>;
  console.log(left.length === 0 ? "Sisa '7 hari' di landing: BERSIH" : `Masih ada: ${left.map((x) => x.key).join(", ")}`);
  process.exit(0);
}
main().catch((e) => {
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});
