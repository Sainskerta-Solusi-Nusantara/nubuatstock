import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

async function main() {
  const r = await db.execute(
    sql.raw(
      "select key, value::text as value from app_config where key like 'trial.%' or (key like 'landing.%' and value::text ilike '%7 hari%') order by key",
    ),
  );
  const rows = r as unknown as Array<{ key: string; value: string }>;
  if (rows.length === 0) console.log("(tidak ada trial.* / landing.* dengan '7 hari')");
  for (const x of rows) console.log(`${x.key} = ${x.value}`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
