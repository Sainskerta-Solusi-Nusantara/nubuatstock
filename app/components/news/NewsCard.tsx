import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SentimentBadge } from "./SentimentBadge";
import type { NewsListItem } from "@/lib/news/service";
import { timeAgoId } from "@/lib/utils/datetime";

export function NewsCard({ article }: { article: NewsListItem }) {
  return (
    <Card className="overflow-hidden transition hover:border-primary/40 hover:shadow-sm">
      <CardContent className="p-0">
        <div className="flex">
          {article.imageUrl ? (
            <Link
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-32 w-44 shrink-0 overflow-hidden bg-muted sm:block"
            >
              <Image
                src={article.imageUrl}
                alt=""
                width={176}
                height={128}
                className="h-full w-full object-cover transition group-hover:scale-105"
                unoptimized
              />
            </Link>
          ) : null}
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {article.sourceLogo ? (
                <Image
                  src={article.sourceLogo}
                  alt={article.sourceName}
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded-sm object-contain"
                  unoptimized
                />
              ) : (
                <div className="h-4 w-4 rounded-sm bg-muted" />
              )}
              <span className="font-semibold uppercase tracking-wide">{article.sourceName}</span>
              <span>·</span>
              <span>{timeAgoId(article.publishedAt)}</span>
              <span className="ml-auto">
                <SentimentBadge
                  sentiment={article.sentiment}
                  score={article.sentimentScore}
                  reason={article.sentimentReason}
                />
              </span>
            </div>
            <Link
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-start gap-1 text-base font-semibold leading-snug hover:underline"
            >
              <span>{article.title}</span>
              <ExternalLink className="mt-1 h-3 w-3 shrink-0 opacity-40 transition group-hover:opacity-100" />
            </Link>
            {article.summary && (
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {article.summary}
              </p>
            )}
            {article.tickers.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {article.tickers.slice(0, 6).map((t) => (
                  <Link
                    key={t.kode}
                    href={`/ticker/${t.kode}`}
                    title={t.namaPerusahaan ?? undefined}
                    className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    {t.kode}
                  </Link>
                ))}
                {article.tickers.length > 6 && (
                  <span className="text-[10px] text-muted-foreground">+{article.tickers.length - 6}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
