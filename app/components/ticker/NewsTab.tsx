import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export async function NewsTab({ ticker }: { ticker: string }) {
  const { listNews } = await import("@/lib/news/service");
  const { NewsCard } = await import("@/components/news/NewsCard");
  const articles = await listNews({ ticker, limit: 30 });

  if (articles.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Berita {ticker}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={`Belum ada berita untuk ${ticker}`}
            description="News aggregator otomatis tag artikel ke ticker berdasarkan konteks (kode di kurung, awalan 'saham', atau nama perusahaan). Coba cari di feed utama: /news"
          />
        </CardContent>
      </Card>
    );
  }

  const bullish = articles.filter((a) => a.sentiment === "bullish").length;
  const bearish = articles.filter((a) => a.sentiment === "bearish").length;
  const neutral = articles.filter((a) => a.sentiment === "neutral").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Berita {ticker}</CardTitle>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded bg-bull-soft px-2 py-0.5 font-medium text-bull">
              Bullish: {bullish}
            </span>
            <span className="rounded bg-muted px-2 py-0.5 font-medium text-muted-foreground">
              Neutral: {neutral}
            </span>
            <span className="rounded bg-bear-soft px-2 py-0.5 font-medium text-bear">
              Bearish: {bearish}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {articles.map((a) => (
            <NewsCard key={a.id} article={a} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
