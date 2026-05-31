import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { ulid, ulidRef } from "./_base";

/**
 * Riwayat pengerjaan Try Out WMI per user.
 *
 * Bank soal (paket + soal) = konten statik (lib/tryout/packages). Di DB hanya
 * disimpan ATTEMPT (sesi pengerjaan) + jawaban + skor, supaya history & sertifikat
 * bisa dilacak.
 */
export const tryoutAttempts = pgTable(
  "tryout_attempts",
  {
    id: ulid(),
    userId: ulidRef("user_id"),
    packageSlug: text("package_slug").notNull(),
    /** Jumlah soal di paket saat dikerjakan. */
    totalQuestions: integer("total_questions").notNull(),
    correctCount: integer("correct_count").notNull(),
    /** Skor 0-100 (persen benar). */
    scorePct: integer("score_pct").notNull(),
    passed: boolean("passed").notNull(),
    /** Detik yang dipakai mengerjakan. */
    durationSec: integer("duration_sec"),
    /** Jawaban user per soal: { questionId: selectedIndex }. */
    answers: jsonb("answers").$type<Record<string, number>>().notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("tryout_attempts_user_idx").on(t.userId),
    index("tryout_attempts_user_pkg_idx").on(t.userId, t.packageSlug),
    index("tryout_attempts_submitted_idx").on(t.submittedAt),
  ],
);

export type TryoutAttempt = typeof tryoutAttempts.$inferSelect;
export type NewTryoutAttempt = typeof tryoutAttempts.$inferInsert;
