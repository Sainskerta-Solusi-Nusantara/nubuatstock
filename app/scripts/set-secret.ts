#!/usr/bin/env tsx
/**
 * scripts/set-secret.ts
 *
 * CLI utility untuk menyimpan secret terenkripsi ke `app_secrets` setelah deploy.
 * Dipakai untuk rotation atau menambahkan secret tanpa harus update via UI admin.
 *
 * Usage:
 *   npx tsx scripts/set-secret.ts <key> <value>
 *   # atau lebih aman (value via stdin, tidak terlihat di process list):
 *   echo "sk-xxxx" | npx tsx scripts/set-secret.ts ai.deepseek.api_key --stdin
 *
 * Catatan: secret di-encrypt dengan APP_MASTER_KEY (lihat lib/crypto.ts) sebelum
 * disimpan. Tidak ada secret yang ditulis ke log.
 */

import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { appSecrets } from "../db/schema/config";
import { encryptSecret } from "../lib/crypto";
import { logger } from "../lib/logger";

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data.trim()));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: tsx scripts/set-secret.ts <key> <value>");
    console.error("   or: <stdin> | tsx scripts/set-secret.ts <key> --stdin");
    process.exit(1);
  }

  const key = args[0]!;
  let value: string;

  if (args[1] === "--stdin") {
    value = await readStdin();
  } else if (args[1]) {
    value = args[1];
  } else {
    console.error("Missing value. Provide as 2nd arg or pipe via --stdin.");
    process.exit(1);
  }

  if (!key.match(/^[a-z][a-z0-9_.]*$/)) {
    console.error("Key must match /^[a-z][a-z0-9_.]*$/ (e.g., ai.deepseek.api_key)");
    process.exit(1);
  }

  if (value.length === 0) {
    console.error("Empty value rejected.");
    process.exit(1);
  }

  const encrypted = encryptSecret(value);
  const existing = await db.select().from(appSecrets).where(eq(appSecrets.key, key)).limit(1);

  if (existing.length === 0) {
    await db.insert(appSecrets).values({
      key,
      encryptedValue: encrypted,
      lastRotatedAt: new Date(),
    });
    logger.info({ key }, "Secret created");
  } else {
    await db
      .update(appSecrets)
      .set({ encryptedValue: encrypted, lastRotatedAt: new Date() })
      .where(eq(appSecrets.key, key));
    logger.info({ key }, "Secret rotated");
  }

  console.log(`✓ Secret '${key}' stored (encrypted). Cleanup: unset any BOOTSTRAP_* env var.`);
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err: err.message }, "Failed to set secret");
  process.exit(1);
});
