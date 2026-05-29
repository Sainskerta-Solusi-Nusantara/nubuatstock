#!/usr/bin/env tsx
/**
 * scripts/seed-demo-users.ts
 *
 * Bikin 3 demo user untuk testing akses per role:
 *
 *   ┌─────────────────────────────┬─────────────────────┬───────────────┐
 *   │ Email                       │ Password            │ Role          │
 *   ├─────────────────────────────┼─────────────────────┼───────────────┤
 *   │ user@nubuat.local           │ NubuatUser2026!     │ user          │
 *   │ admin@nubuat.local          │ NubuatAdmin2026!    │ admin         │
 *   │ superadmin@nubuat.local     │ NubuatSuper2026!    │ superadmin    │
 *   └─────────────────────────────┴─────────────────────┴───────────────┘
 *
 * Idempotent: kalau user sudah ada, hanya UPDATE role (tidak buat ulang password).
 *
 * Cara pakai:
 *   npx tsx scripts/seed-demo-users.ts
 *
 * ⚠️  HANYA UNTUK DEVELOPMENT/STAGING. JANGAN run di production.
 *     Untuk production, ganti password & email ini dengan akun real.
 */

import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { logger } from "../lib/logger";
import { getAuth } from "../lib/auth/server";
import { env } from "../lib/env";

interface DemoUser {
  email: string;
  password: string;
  name: string;
  role: "user" | "admin" | "superadmin";
}

const DEMO_USERS: DemoUser[] = [
  { email: "user@nubuat.local", password: "NubuatUser2026!", name: "Demo User", role: "user" },
  { email: "admin@nubuat.local", password: "NubuatAdmin2026!", name: "Demo Admin", role: "admin" },
  { email: "superadmin@nubuat.local", password: "NubuatSuper2026!", name: "Demo Super Admin", role: "superadmin" },
];

async function main() {
  if (env.NODE_ENV === "production") {
    logger.error("Refused: demo users tidak boleh di-seed di NODE_ENV=production");
    process.exit(1);
  }

  logger.info("Seeding demo users...");
  const auth = await getAuth();

  for (const u of DEMO_USERS) {
    // Cek apakah user sudah ada
    const existing = (await db.execute(
      sql`SELECT id, email, role FROM users WHERE lower(email) = lower(${u.email}) AND deleted_at IS NULL LIMIT 1`,
    )) as unknown as Array<{ id: string; email: string; role: string }>;

    if (existing.length > 0) {
      const row = existing[0]!;
      if (row.role !== u.role) {
        await db.execute(sql`UPDATE users SET role = ${u.role}, updated_at = NOW() WHERE id = ${row.id}`);
        logger.info({ email: u.email, oldRole: row.role, newRole: u.role }, "Demo user role updated");
      } else {
        logger.info({ email: u.email, role: u.role }, "Demo user exists (no change)");
      }
      continue;
    }

    // Belum ada — buat lewat better-auth signUp
    try {
      const result = await auth.api.signUpEmail({
        body: { email: u.email, password: u.password, name: u.name },
        headers: new Headers({ "x-forwarded-for": "127.0.0.1", "user-agent": "seed-demo-users-script" }),
      });

      // Set role setelah signup (signup default = "user" atau "superadmin" kalau email match bootstrap)
      await db.execute(sql`UPDATE users SET role = ${u.role}, email_verified = true, email_verified_at = NOW(), updated_at = NOW() WHERE lower(email) = lower(${u.email})`);

      logger.info({ email: u.email, role: u.role }, "Demo user created");
    } catch (err) {
      logger.error({ err, email: u.email }, "Failed to create demo user via better-auth.signUpEmail");
    }
  }

  logger.info("Demo users seed complete.");
  console.log("\n┌─────────────────────────────┬─────────────────────┬────────────────┐");
  console.log("│ Email                       │ Password            │ Role           │");
  console.log("├─────────────────────────────┼─────────────────────┼────────────────┤");
  for (const u of DEMO_USERS) {
    console.log(`│ ${u.email.padEnd(28)}│ ${u.password.padEnd(20)}│ ${u.role.padEnd(15)}│`);
  }
  console.log("└─────────────────────────────┴─────────────────────┴────────────────┘\n");
  console.log("Login di http://localhost:3000/login dengan kredensial di atas.\n");

  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Demo users seed failed");
  process.exit(1);
});
