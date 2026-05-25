import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/server";
import { requireSuperadmin } from "@/lib/auth/roles";
import { ok, handleError } from "@/lib/utils/api";
import {
  getGrowthSnapshot,
  getRevenueSnapshot,
  getTierBreakdown,
  getDailyGrowth,
  getSystemHealth,
} from "@/lib/superadmin/stats";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    requireSuperadmin(session);
    const [growth, revenue, tiers, daily, system] = await Promise.all([
      getGrowthSnapshot(),
      getRevenueSnapshot(),
      getTierBreakdown(),
      getDailyGrowth(30),
      getSystemHealth(),
    ]);
    return ok({ growth, revenue, tiers, daily, system });
  } catch (err) {
    return handleError(err);
  }
}
