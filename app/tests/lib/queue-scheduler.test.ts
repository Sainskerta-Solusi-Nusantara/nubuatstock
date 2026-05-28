import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests untuk lib/queue/scheduler.ts `bootstrapSchedules`.
 *
 * Strategi: mock `@/lib/config` (getConfig) & `@/lib/queue` index
 * (scheduleRepeatableJob) supaya tidak menyentuh DB / Redis. Verifikasi:
 *  - Job kritikal selalu terjadwal (evaluate-outcomes, expire-trial,
 *    account.deletion.sweep, alerts.check, digest.daily).
 *  - defaultCron dipakai saat config key tidak ada (ConfigNotFoundError).
 *  - Nilai dari app_config meng-override defaultCron.
 */

interface ScheduledCall {
  queueName: string;
  jobName: string;
  data: unknown;
  cron: string;
  opts: { tz?: string };
}

const scheduledCalls: ScheduledCall[] = [];

vi.mock("@/lib/queue/index", () => ({
  scheduleRepeatableJob: vi.fn(
    async (queueName: string, jobName: string, data: unknown, cron: string, opts: { tz?: string } = {}) => {
      scheduledCalls.push({ queueName, jobName, data, cron, opts });
    },
  ),
}));

class ConfigNotFoundError extends Error {}

const configOverrides = new Map<string, unknown>();

vi.mock("@/lib/config", () => ({
  ConfigNotFoundError,
  getConfig: vi.fn(async (key: string) => {
    if (configOverrides.has(key)) return configOverrides.get(key);
    throw new ConfigNotFoundError(`missing ${key}`);
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

beforeEach(() => {
  scheduledCalls.length = 0;
  configOverrides.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

function find(jobName: string): ScheduledCall | undefined {
  return scheduledCalls.find((c) => c.jobName === jobName);
}

describe("lib/queue/scheduler bootstrapSchedules", () => {
  it("schedules all critical operational jobs with default crons", async () => {
    const { bootstrapSchedules } = await import("@/lib/queue/scheduler");
    await bootstrapSchedules();

    // Daily picks evaluator (§8.5 #34) — post-market 16:30 WIB.
    const evalJob = find("evaluate-outcomes");
    expect(evalJob).toBeDefined();
    expect(evalJob!.queueName).toBe("picks.generate");
    expect(evalJob!.cron).toBe("30 16 * * 1-5");

    // Trial expiry.
    const trial = find("expire-trial");
    expect(trial).toBeDefined();
    expect(trial!.queueName).toBe("picks.generate");

    // Account hard-delete sweep (§8.7 #46).
    const sweep = find("scheduled.sweep");
    expect(sweep).toBeDefined();
    expect(sweep!.queueName).toBe("account.deletion.sweep");

    // Alerts + daily digest.
    expect(find("scheduled.check")?.queueName).toBe("alerts.check");
    const digest = scheduledCalls.find(
      (c) => c.queueName === "digest.daily" && c.jobName === "scheduled.daily",
    );
    expect(digest).toBeDefined();
  });

  it("applies runtime.timezone to every schedule", async () => {
    configOverrides.set("runtime.timezone", "Asia/Jakarta");
    const { bootstrapSchedules } = await import("@/lib/queue/scheduler");
    await bootstrapSchedules();

    expect(scheduledCalls.length).toBeGreaterThan(0);
    for (const call of scheduledCalls) {
      expect(call.opts.tz).toBe("Asia/Jakarta");
    }
  });

  it("uses configured cron from app_config when present, overriding default", async () => {
    configOverrides.set("picks.outcome_eval_cron", "0 18 * * 1-5");
    const { bootstrapSchedules } = await import("@/lib/queue/scheduler");
    await bootstrapSchedules();

    expect(find("evaluate-outcomes")!.cron).toBe("0 18 * * 1-5");
  });

  it("still schedules a job even when its config key is missing", async () => {
    // No overrides at all → every job must fall back to defaultCron.
    const { bootstrapSchedules } = await import("@/lib/queue/scheduler");
    await bootstrapSchedules();

    for (const call of scheduledCalls) {
      expect(typeof call.cron).toBe("string");
      expect(call.cron.length).toBeGreaterThan(0);
    }
  });
});
