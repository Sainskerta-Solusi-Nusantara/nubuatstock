import { ConfigurationError, UnauthorizedError } from "@/lib/errors";

/**
 * Cross-agent dependency adapter (Agent 8 perspective).
 *
 * Mengisolasi import dari domain milik agent lain agar build tidak gagal selama
 * mereka belum publish module. JANGAN duplikasi logic — semua hanya re-export tipis.
 *
 * Kontrak:
 *  - Agent 3 (`@/lib/auth`)    → requireSession(): Promise<SessionUser>
 *  - Agent 4 (`@/lib/billing`) → requireEntitlement / resolveEntitlement
 *  - Agent 7 (`@/lib/ai`)      → generatePickNarrative(input): Promise<NarrativeResult|null>
 *  - Agent 10 (`@/lib/queue`)  → publishEvent(topic, payload)
 */

export interface SessionUser {
  userId: string;
  role: string;
  tier?: string | null;
}

export async function requireSession(): Promise<SessionUser> {
  try {
    const mod: unknown = await import("@/lib/auth");
    const fn = (mod as { requireSession?: () => Promise<unknown> }).requireSession;
    if (typeof fn !== "function") throw new ConfigurationError("auth.requireSession");
    const result = (await fn()) as { user?: { id: string; role: string }; userId?: string; role?: string };
    if ("user" in result && result.user) {
      return { userId: result.user.id, role: result.user.role };
    }
    if (result.userId && result.role) {
      return { userId: result.userId, role: result.role };
    }
    throw new UnauthorizedError();
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    if (err instanceof ConfigurationError) throw err;
    throw new UnauthorizedError();
  }
}

/**
 * Resolve numeric entitlement (max visible daily picks per tier).
 * Default kalau billing module belum siap: 3 (free-tier minimum yang masuk akal).
 * Caller WAJIB respect return value (clamp/slice).
 */
export async function resolveDailyVisibleEntitlement(userId: string): Promise<number> {
  const mod: unknown = await import("@/lib/billing").catch(() => null);
  if (!mod) return 3;
  const fn = (mod as {
    resolveEntitlement?: (uid: string, key: string) => Promise<number | boolean | null>;
  }).resolveEntitlement;
  if (typeof fn !== "function") return 3;
  try {
    const result = await fn(userId, "picks.daily_visible");
    if (typeof result === "number" && Number.isFinite(result) && result > 0) return result;
    return 3;
  } catch {
    return 3;
  }
}

export interface NarrativeInput {
  companyKode: string;
  setupType: string;
  score: number;
  entryZoneLow: number;
  entryZoneHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number | null;
  tp3: number | null;
  rewardRiskRatio: number;
  factorBreakdown: Record<string, number>;
}

export interface NarrativeResult {
  text: string;
  generatedBy: string;
}

/**
 * Panggil Agent 7 AI service untuk generate narasi pick. JANGAN dummy — return
 * null kalau modul/API key belum siap. UI akan handle empty state.
 */
export async function generatePickNarrative(
  input: NarrativeInput,
): Promise<NarrativeResult | null> {
  const mod: unknown = await import("@/lib/ai").catch(() => null);
  if (!mod) return null;
  const fn = (mod as {
    generatePickNarrative?: (i: NarrativeInput) => Promise<NarrativeResult | null>;
  }).generatePickNarrative;
  if (typeof fn !== "function") return null;
  try {
    return await fn(input);
  } catch {
    return null;
  }
}

export async function publishEvent(
  topic: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const mod: unknown = await import("@/lib/queue").catch(() => null);
  if (!mod) return;
  const fn = (mod as { publishEvent?: (t: string, p: Record<string, unknown>) => Promise<void> })
    .publishEvent;
  if (typeof fn !== "function") return;
  try {
    await fn(topic, payload);
  } catch {
    /* swallow — telemetry via queue/observability */
  }
}
