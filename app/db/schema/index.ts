/**
 * Barrel export untuk seluruh schema.
 *
 * Setiap agent menambah `export * from "./<their-file>";` di sini saat
 * mereka membuat schema baru. Pastikan tidak ada nama collision.
 */

export * from "./config";

// Agents append below — keep alphabetical:
export * from "./ai"; // Agent 7
export * from "./analysis-snapshots"; // Cached verdict+wyckoff+pattern aggregate
export * from "./audit"; // Agent 10/11
export * from "./auth"; // Agent 3
export * from "./billing"; // Agent 4
export * from "./companies"; // Agent 2
export * from "./daily-digest"; // AI-generated daily morning brief
export * from "./elliott"; // Elliott Wave snapshots
export * from "./embeddings"; // Vector RAG
export * from "./experiments"; // A/B testing
export * from "./feature-flags"; // Agent 10
export * from "./glossary"; // Glossary / kamus istilah saham (DB-driven + ISR)
export * from "./fundamentals"; // Enrichment (Yahoo Finance)
// Disambiguate: both `companies` and `fundamentals` export `Dividend`.
// Explicit re-exports below override the ambiguous `export *` collisions:
// - `Dividend` resolves to the one from `./fundamentals` (dividendHistory).
// - `companies.Dividend` is re-exported under the alias `CompanyDividend`.
export type { Dividend } from "./fundamentals";
export type { Dividend as CompanyDividend } from "./companies";
export * from "./legal-acceptance"; // Legal compliance audit
export * from "./market"; // Agent 5
export * from "./news"; // News & sentiment
export * from "./notifications"; // Agent 12
export * from "./paper-trading"; // Paper trading system
export * from "./patterns"; // Pattern recognition
export * from "./picks"; // Agent 8
export * from "./reference"; // Agent 1
export * from "./research"; // Research module
export * from "./saved-screens"; // Saved custom screens
export * from "./shareholders"; // Major shareholders + insider trades
export * from "./support"; // Customer support tickets
export * from "./technical"; // Technical indicator snapshots
export * from "./user-data"; // Agent 6
