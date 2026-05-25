/**
 * Event topic constants untuk domain picks.
 *
 * Lihat juga `PICKS_EVENTS` di `@/lib/types/picks` (export sama, di-duplicate
 * di file ini untuk konsistensi dengan agent lain yang punya pattern `events.ts`).
 */
export const PICKS_EVENTS = {
  GENERATED: "picks.generated",
  OUTCOME_EVALUATED: "picks.outcome_evaluated",
} as const;
