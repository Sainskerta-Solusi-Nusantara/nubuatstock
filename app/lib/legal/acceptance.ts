import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userLegalAcceptances } from "@/db/schema/legal-acceptance";

export const CURRENT_LEGAL_VERSION = "v1";

/**
 * Cek apakah user sudah menerima disclaimer versi terkini.
 * Return false kalau belum (gate akan muncul). Fail-open kalau DB error — user
 * tetap bisa pakai (lebih baik dari false-blocker untuk demo dev).
 */
export async function hasAcceptedDisclaimer(userId: string): Promise<boolean> {
  try {
    const rows = await db
      .select({ id: userLegalAcceptances.id })
      .from(userLegalAcceptances)
      .where(
        and(
          eq(userLegalAcceptances.userId, userId),
          eq(userLegalAcceptances.documentType, "disclaimer"),
          eq(userLegalAcceptances.documentVersion, CURRENT_LEGAL_VERSION),
        ),
      )
      .limit(1);
    return rows.length > 0;
  } catch {
    return true; // fail-open
  }
}

export async function recordAcceptance(opts: {
  userId: string;
  documentType: "disclaimer" | "terms" | "privacy";
  version: string;
  ip?: string;
  userAgent?: string;
}) {
  await db
    .insert(userLegalAcceptances)
    .values({
      userId: opts.userId,
      documentType: opts.documentType,
      documentVersion: opts.version,
      ipAddress: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
    })
    .onConflictDoNothing({
      target: [userLegalAcceptances.userId, userLegalAcceptances.documentType, userLegalAcceptances.documentVersion],
    });
}
