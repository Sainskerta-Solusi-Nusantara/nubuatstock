import { sql } from "drizzle-orm";
import { index, inet, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { ulid, withTimestamps } from "./_base";
import { users } from "./auth";

/**
 * Riwayat penerimaan dokumen legal per user — untuk audit compliance OJK & PDP.
 *
 * Versioning: setiap perubahan material di Privacy/ToS/Disclaimer dapat
 * versi baru (mis. "v1.1") — user wajib accept ulang.
 *
 * Schema kompatibel dengan dokumen lain (privacy/terms/disclaimer) tanpa
 * perlu kolom terpisah per dokumen.
 */
export const userLegalAcceptances = pgTable(
  "user_legal_acceptances",
  {
    id: ulid(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(), // "privacy" | "terms" | "disclaimer"
    documentVersion: text("document_version").notNull().default("v1"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" })
      .notNull()
      .default(sql`now()`),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    ...withTimestamps,
  },
  (t) => [
    uniqueIndex("user_legal_acceptances_uq").on(t.userId, t.documentType, t.documentVersion),
    index("user_legal_acceptances_user_idx").on(t.userId),
  ],
);

export type UserLegalAcceptance = typeof userLegalAcceptances.$inferSelect;
