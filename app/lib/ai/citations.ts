import type { AiCitation } from "@/lib/types/ai";

/**
 * Citation extraction (AI Buddy v2 — inline citations).
 *
 * Selama tool-use loop, setiap tool call yang BERHASIL (ok=true) di-map ke satu
 * atau beberapa `AiCitation`. Tujuannya: surface "Sumber:" ke UI supaya jawaban
 * AI ter-grounding ke data tool (anti-halusinasi) dan user bisa verifikasi.
 *
 * Map per tool dibuat defensif: kalau bentuk data tidak sesuai ekspektasi, tool
 * tetap menghasilkan satu citation generik (tidak pernah throw).
 */

interface ToolResultLike {
  ok: boolean;
  data?: unknown;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * Build citations dari satu tool call. `args` adalah argumen yang dikirim ke tool
 * (dipakai untuk fallback label, mis. ticker dari arg `kode`).
 */
export function citationsFromTool(
  toolName: string,
  args: Record<string, unknown>,
  result: ToolResultLike,
): AiCitation[] {
  if (!result.ok) return [];
  const data = result.data;
  const argKode = str(args.kode) ?? str(args.ticker);

  switch (toolName) {
    case "get_recent_news": {
      const rec = asRecord(data);
      const articles = Array.isArray(rec?.articles) ? rec!.articles : [];
      const out: AiCitation[] = [];
      for (const a of articles.slice(0, 5)) {
        const art = asRecord(a);
        if (!art) continue;
        const title = str(art.title);
        if (!title) continue;
        out.push({
          tool: toolName,
          label: title,
          url: str(art.url),
          kode: argKode,
        });
      }
      return out.length > 0 ? out : [{ tool: toolName, label: "Berita terbaru", kode: argKode }];
    }

    case "search_research": {
      const rec = asRecord(data);
      const reports = Array.isArray(rec?.reports) ? rec!.reports : [];
      const out: AiCitation[] = [];
      for (const r of reports.slice(0, 5)) {
        const rep = asRecord(r);
        if (!rep) continue;
        const title = str(rep.title);
        if (!title) continue;
        out.push({
          tool: toolName,
          label: title,
          url: str(rep.url),
          kode: str(rep.ticker) ?? argKode,
        });
      }
      return out.length > 0 ? out : [{ tool: toolName, label: "Riset emiten", kode: argKode }];
    }

    case "get_quote":
      return [{ tool: toolName, label: `Harga ${argKode ?? "emiten"}`, kode: argKode }];

    case "get_ohlcv":
      return [{ tool: toolName, label: `Data historis ${argKode ?? "emiten"}`, kode: argKode }];

    case "get_company_info":
      return [{ tool: toolName, label: `Profil ${argKode ?? "emiten"}`, kode: argKode }];

    case "compute_indicators":
      return [{ tool: toolName, label: `Indikator teknikal ${argKode ?? ""}`.trim(), kode: argKode }];

    case "get_daily_picks":
      return [{ tool: toolName, label: "Daily Picks" }];

    case "get_user_watchlist":
      return [{ tool: toolName, label: "Watchlist kamu" }];

    case "search_companies":
      return [{ tool: toolName, label: "Hasil pencarian emiten" }];

    case "run_backtest":
      return [{ tool: toolName, label: `Backtest ${argKode ?? "strategi"}`, kode: argKode }];

    default:
      return [{ tool: toolName, label: toolName, kode: argKode }];
  }
}

/**
 * Gabungkan & dedupe citations (kunci: tool|label|url). Pertahankan urutan kemunculan.
 */
export function dedupeCitations(citations: AiCitation[]): AiCitation[] {
  const seen = new Set<string>();
  const out: AiCitation[] = [];
  for (const c of citations) {
    const key = `${c.tool}|${c.label}|${c.url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}
