import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tryoutAttempts, type TryoutAttempt } from "@/db/schema/tryout";
import { getTryoutPackage } from "./packages";
import { TRYOUT_PASS_THRESHOLD, WMI_DOMAIN_LABEL, type WmiDomain } from "./types";

export interface GradedQuestion {
  id: string;
  domain: WmiDomain;
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
  isCorrect: boolean;
  explanation: string;
}

export interface GradedResult {
  attemptId: string;
  packageSlug: string;
  packageTitle: string;
  total: number;
  correct: number;
  scorePct: number;
  passed: boolean;
  passThreshold: number;
  durationSec: number | null;
  /** Ringkasan benar per domain. */
  byDomain: Array<{ domain: WmiDomain; label: string; correct: number; total: number }>;
  questions: GradedQuestion[];
  submittedAt: Date;
}

/**
 * Nilai jawaban try out, simpan attempt ke DB, kembalikan hasil + pembahasan.
 * answers: { questionId: selectedIndex }.
 */
export async function submitTryout(opts: {
  userId: string;
  packageSlug: string;
  answers: Record<string, number>;
  durationSec?: number | null;
}): Promise<GradedResult> {
  const pkg = getTryoutPackage(opts.packageSlug);
  if (!pkg) throw new Error(`Paket try out tidak ditemukan: ${opts.packageSlug}`);

  const graded: GradedQuestion[] = pkg.questions.map((q) => {
    const selected = opts.answers[q.id];
    const selectedIndex = typeof selected === "number" ? selected : null;
    return {
      id: q.id,
      domain: q.domain,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      selectedIndex,
      isCorrect: selectedIndex === q.correctIndex,
      explanation: q.explanation,
    };
  });

  const total = graded.length;
  const correct = graded.filter((g) => g.isCorrect).length;
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = scorePct >= TRYOUT_PASS_THRESHOLD;

  // Ringkasan per domain.
  const domainMap = new Map<WmiDomain, { correct: number; total: number }>();
  for (const g of graded) {
    const d = domainMap.get(g.domain) ?? { correct: 0, total: 0 };
    d.total += 1;
    if (g.isCorrect) d.correct += 1;
    domainMap.set(g.domain, d);
  }
  const byDomain = Array.from(domainMap.entries()).map(([domain, v]) => ({
    domain,
    label: WMI_DOMAIN_LABEL[domain],
    correct: v.correct,
    total: v.total,
  }));

  const now = new Date();
  const [row] = await db
    .insert(tryoutAttempts)
    .values({
      userId: opts.userId,
      packageSlug: opts.packageSlug,
      totalQuestions: total,
      correctCount: correct,
      scorePct,
      passed,
      durationSec: opts.durationSec ?? null,
      answers: opts.answers,
      submittedAt: now,
    })
    .returning({ id: tryoutAttempts.id });

  return {
    attemptId: row!.id,
    packageSlug: pkg.slug,
    packageTitle: pkg.title,
    total,
    correct,
    scorePct,
    passed,
    passThreshold: TRYOUT_PASS_THRESHOLD,
    durationSec: opts.durationSec ?? null,
    byDomain,
    questions: graded,
    submittedAt: now,
  };
}

/** Ambil 1 attempt milik user + regrade untuk pembahasan. */
export async function getAttempt(userId: string, attemptId: string): Promise<GradedResult | null> {
  const [att] = await db
    .select()
    .from(tryoutAttempts)
    .where(and(eq(tryoutAttempts.id, attemptId), eq(tryoutAttempts.userId, userId)))
    .limit(1);
  if (!att) return null;
  return regradeFromAttempt(att);
}

function regradeFromAttempt(att: TryoutAttempt): GradedResult {
  const pkg = getTryoutPackage(att.packageSlug);
  const answers = att.answers ?? {};
  const questions: GradedQuestion[] = (pkg?.questions ?? []).map((q) => {
    const selected = answers[q.id];
    const selectedIndex = typeof selected === "number" ? selected : null;
    return {
      id: q.id,
      domain: q.domain,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      selectedIndex,
      isCorrect: selectedIndex === q.correctIndex,
      explanation: q.explanation,
    };
  });
  const domainMap = new Map<WmiDomain, { correct: number; total: number }>();
  for (const g of questions) {
    const d = domainMap.get(g.domain) ?? { correct: 0, total: 0 };
    d.total += 1;
    if (g.isCorrect) d.correct += 1;
    domainMap.set(g.domain, d);
  }
  return {
    attemptId: att.id,
    packageSlug: att.packageSlug,
    packageTitle: pkg?.title ?? att.packageSlug,
    total: att.totalQuestions,
    correct: att.correctCount,
    scorePct: att.scorePct,
    passed: att.passed,
    passThreshold: TRYOUT_PASS_THRESHOLD,
    durationSec: att.durationSec,
    byDomain: Array.from(domainMap.entries()).map(([domain, v]) => ({
      domain,
      label: WMI_DOMAIN_LABEL[domain],
      correct: v.correct,
      total: v.total,
    })),
    questions,
    submittedAt: att.submittedAt,
  };
}

export interface AttemptSummary {
  id: string;
  packageSlug: string;
  packageTitle: string;
  scorePct: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  submittedAt: Date;
}

/** Riwayat attempt user (terbaru dulu). */
export async function listAttempts(userId: string, limit = 50): Promise<AttemptSummary[]> {
  const rows = await db
    .select()
    .from(tryoutAttempts)
    .where(eq(tryoutAttempts.userId, userId))
    .orderBy(desc(tryoutAttempts.submittedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    packageSlug: r.packageSlug,
    packageTitle: getTryoutPackage(r.packageSlug)?.title ?? r.packageSlug,
    scorePct: r.scorePct,
    correctCount: r.correctCount,
    totalQuestions: r.totalQuestions,
    passed: r.passed,
    submittedAt: r.submittedAt,
  }));
}

/** Statistik ringkas untuk header history. */
export async function getTryoutStats(userId: string): Promise<{
  attempts: number;
  passed: number;
  bestScore: number;
  packagesPassed: number;
}> {
  const rows = await db
    .select({
      passed: tryoutAttempts.passed,
      scorePct: tryoutAttempts.scorePct,
      packageSlug: tryoutAttempts.packageSlug,
    })
    .from(tryoutAttempts)
    .where(eq(tryoutAttempts.userId, userId));
  const passedPkgs = new Set(rows.filter((r) => r.passed).map((r) => r.packageSlug));
  return {
    attempts: rows.length,
    passed: rows.filter((r) => r.passed).length,
    bestScore: rows.reduce((m, r) => Math.max(m, r.scorePct), 0),
    packagesPassed: passedPkgs.size,
  };
}

/** Cek apakah user sudah pernah LULUS paket tertentu (untuk sertifikat). */
export async function hasPassed(userId: string, packageSlug: string): Promise<boolean> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tryoutAttempts)
    .where(
      and(
        eq(tryoutAttempts.userId, userId),
        eq(tryoutAttempts.packageSlug, packageSlug),
        eq(tryoutAttempts.passed, true),
      ),
    );
  return (row?.n ?? 0) > 0;
}
