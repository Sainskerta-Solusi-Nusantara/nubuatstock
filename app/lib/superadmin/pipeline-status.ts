import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { newsArticles } from "@/db/schema/news";
import { quotesEod } from "@/db/schema/market";
import { dailyPicks } from "@/db/schema/picks";
import { securitiesPicks } from "@/db/schema/securities-picks";
import { technicalSnapshots } from "@/db/schema/technical";

/**
 * Status terakhir tiap pipeline data, untuk ditampilkan di panel pemicu manual
 * (superadmin/system). Tujuannya: superadmin tahu data kapan terakhir masuk,
 * supaya tidak menjalankan ingest dua kali sia-sia.
 */
export interface PipelineStepStatus {
  /** Waktu data terakhir tersimpan/diingest (wall-clock). */
  lastAt: string | null;
  /** Penanda "tanggal data" (mis. tanggal EOD/picks) bila relevan. */
  dataDate: string | null;
  /** Jumlah baris untuk tanggal/periode terbaru — konteks ringkas. */
  count: number;
}

export type PipelineStatus = Record<
  "news" | "eod" | "technical" | "picks" | "securities",
  PipelineStepStatus
>;

export async function getPipelineStatus(): Promise<PipelineStatus> {
  const [news, eod, technical, picks, securities] = await Promise.all([
    // News: kapan artikel terakhir di-fetch + jumlah 24 jam terakhir.
    db
      .select({
        lastAt: sql<string | null>`max(${newsArticles.fetchedAt})`,
        count: sql<number>`count(*) filter (where ${newsArticles.fetchedAt} >= now() - interval '24 hours')`,
      })
      .from(newsArticles),
    // EOD: tanggal perdagangan terbaru + kapan baris itu terakhir di-update +
    // jumlah emiten pada tanggal tsb.
    db
      .select({
        dataDate: sql<string | null>`max(${quotesEod.tradeDate})`,
        lastAt: sql<string | null>`max(${quotesEod.updatedAt})`,
        count: sql<number>`count(*) filter (where ${quotesEod.tradeDate} = (select max(trade_date) from quotes_eod))`,
      })
      .from(quotesEod),
    // Technical snapshots: tanggal snapshot terbaru + kapan dihitung + jumlah
    // emiten yang punya snapshot pada tanggal tsb (dipakai preset teknikal screener).
    db
      .select({
        dataDate: sql<string | null>`max(${technicalSnapshots.tradeDate})`,
        lastAt: sql<string | null>`max(${technicalSnapshots.updatedAt})`,
        count: sql<number>`count(*) filter (where ${technicalSnapshots.tradeDate} = (select max(trade_date) from technical_snapshots))`,
      })
      .from(technicalSnapshots),
    // Daily Picks: tanggal pick terbaru + kapan dipublikasikan + jumlah pick.
    db
      .select({
        dataDate: sql<string | null>`max(${dailyPicks.tradeDate})`,
        lastAt: sql<string | null>`max(${dailyPicks.publishedAt})`,
        count: sql<number>`count(*) filter (where ${dailyPicks.tradeDate} = (select max(trade_date) from daily_picks))`,
      })
      .from(dailyPicks),
    // Securities Picks (Rekomendasi Sekuritas): tanggal pick terbaru + kapan
    // di-ingest + jumlah rekomendasi pada tanggal tsb.
    db
      .select({
        dataDate: sql<string | null>`max(${securitiesPicks.pickDate})`,
        lastAt: sql<string | null>`max(${securitiesPicks.createdAt})`,
        count: sql<number>`count(*) filter (where ${securitiesPicks.pickDate} = (select max(pick_date) from securities_picks))`,
      })
      .from(securitiesPicks),
  ]);

  return {
    news: {
      lastAt: news[0]?.lastAt ?? null,
      dataDate: null,
      count: Number(news[0]?.count ?? 0),
    },
    eod: {
      lastAt: eod[0]?.lastAt ?? null,
      dataDate: eod[0]?.dataDate ?? null,
      count: Number(eod[0]?.count ?? 0),
    },
    technical: {
      lastAt: technical[0]?.lastAt ?? null,
      dataDate: technical[0]?.dataDate ?? null,
      count: Number(technical[0]?.count ?? 0),
    },
    picks: {
      lastAt: picks[0]?.lastAt ?? null,
      dataDate: picks[0]?.dataDate ?? null,
      count: Number(picks[0]?.count ?? 0),
    },
    securities: {
      lastAt: securities[0]?.lastAt ?? null,
      dataDate: securities[0]?.dataDate ?? null,
      count: Number(securities[0]?.count ?? 0),
    },
  };
}
