import { computeIndicatorsTool } from "./compute_indicators";
import { getCompanyInfoTool } from "./get_company_info";
import { getDailyPicksTool } from "./get_daily_picks";
import { getOhlcvTool } from "./get_ohlcv";
import { getQuoteTool } from "./get_quote";
import { getRecentNewsTool } from "./get_recent_news";
import { getUserWatchlistTool } from "./get_user_watchlist";
import { runBacktestTool } from "./run_backtest";
import { searchCompaniesTool } from "./search_companies";
import { toOpenAiTool, type ToolDefinition } from "./types";

/**
 * Central tool registry. Tambah tool baru di sini.
 *
 * Order tidak signifikan untuk LLM, tapi pertahankan stabil agar prompt cache hit.
 */
export const allTools: ToolDefinition[] = [
  getQuoteTool,
  getOhlcvTool,
  getCompanyInfoTool,
  searchCompaniesTool,
  computeIndicatorsTool,
  getUserWatchlistTool,
  getDailyPicksTool,
  getRecentNewsTool,
  runBacktestTool,
] as ToolDefinition[];

const toolByName = new Map<string, ToolDefinition>();
for (const t of allTools) toolByName.set(t.name, t);

export function getTool(name: string): ToolDefinition | undefined {
  return toolByName.get(name);
}

export function listOpenAiTools() {
  return allTools.map(toOpenAiTool);
}

export { toOpenAiTool };
export type { ToolDefinition, ToolContext, ToolResult } from "./types";
