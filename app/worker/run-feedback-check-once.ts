/**
 * Read-only: cek apakah fitur Trial Day-3 Feedback Gate sudah menghasilkan
 * feedback. Tidak menulis apa pun. Jalankan:
 *   npx tsx --env-file=.env worker/run-feedback-check-once.ts
 */
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

async function main() {
  const totals = await db.execute<{
    total: number;
    trial_gate: number;
    last_24h: number;
  }>(sql`
    select
      count(*)::int as total,
      count(*) filter (where metadata ->> 'source' = 'trial_gate')::int as trial_gate,
      count(*) filter (where created_at >= now() - interval '24 hours')::int as last_24h
    from support_feedback
  `);

  const recent = await db.execute<{
    created_at: string;
    user_email: string | null;
    category: string;
    rating: number | null;
    source: string | null;
    message: string;
  }>(sql`
    select created_at, user_email, category, rating,
           metadata ->> 'source' as source,
           left(message, 80) as message
    from support_feedback
    order by created_at desc
    limit 15
  `);

  // Berapa user trialing yang SUDAH lewat 72 jam (mestinya kena gate)
  const eligible = await db.execute<{ eligible: number }>(sql`
    select count(*)::int as eligible
    from user_subscriptions s
    join users u on u.id = s.user_id
    where s.status = 'trialing'
      and u.created_at <= now() - interval '72 hours'
  `);

  const t = (totals.rows ?? totals)[0] as { total: number; trial_gate: number; last_24h: number };
  const e = (eligible.rows ?? eligible)[0] as { eligible: number };
  const rows = (recent.rows ?? recent) as Array<Record<string, unknown>>;

  console.log("=== RINGKASAN FEEDBACK ===");
  console.log("Total feedback        :", t.total);
  console.log("Dari trial_gate (D3)  :", t.trial_gate);
  console.log("Masuk 24 jam terakhir :", t.last_24h);
  console.log("User trialing >72 jam :", e.eligible, "(yang mestinya kena gate)");
  console.log("\n=== 15 FEEDBACK TERBARU ===");
  if (rows.length === 0) {
    console.log("(belum ada feedback sama sekali)");
  } else {
    for (const r of rows) {
      console.log(
        `${String(r.created_at).slice(0, 16)} | src=${r.source ?? "-"} | ${r.category} | ★${r.rating ?? "-"} | ${r.user_email ?? "-"} | ${r.message}`,
      );
    }
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});
