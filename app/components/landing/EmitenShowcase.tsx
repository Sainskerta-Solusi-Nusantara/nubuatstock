import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { EmitenTicker } from "@/lib/landing/types";

export interface EmitenShowcaseProps {
  headline: string;
  subtitle: string;
  tickers: EmitenTicker[];
}

export function EmitenShowcase(props: EmitenShowcaseProps) {
  return (
    <section className="relative border-y border-border/60 bg-card/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{props.headline}</h2>
          <p className="mt-4 text-muted-foreground">{props.subtitle}</p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {props.tickers.map((e) => (
            <Link
              key={e.kode}
              href={`/ticker/${e.kode}`}
              className="group flex flex-col gap-3 rounded-lg border border-border bg-background p-4 transition hover:border-primary/40 hover:bg-card hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <Logo kode={e.kode} url={e.logoUrl ?? null} />
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div>
                <div className="font-semibold tracking-wide">{e.kode}</div>
                <div className="mt-0.5 text-xs leading-snug text-foreground/80 line-clamp-2">{e.nama}</div>
              </div>
              <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{e.sektor}</span>
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">{e.tag}</span>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Klik kode emiten untuk lihat analisa lengkap (perlu login)
        </p>
      </div>
    </section>
  );
}

/**
 * Logo emiten dengan 3-tier rendering:
 *   1. URL valid (dari Yahoo / Clearbit / Favicon — sudah resolved di server)
 *   2. Inisial huruf pertama ticker dalam gradient circle (fallback elegant)
 */
function Logo({ kode, url }: { kode: string; url: string | null }) {
  if (url) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
        <Image
          src={url}
          alt={`Logo ${kode}`}
          width={40}
          height={40}
          className="h-full w-full object-contain"
          unoptimized
        />
      </div>
    );
  }
  // Fallback: gradient circle dengan inisial
  const initial = kode.slice(0, 1);
  const hue = hashHue(kode);
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
      style={{
        background: `linear-gradient(135deg, oklch(0.6 0.18 ${hue}), oklch(0.45 0.18 ${(hue + 40) % 360}))`,
      }}
      aria-label={`Logo placeholder ${kode}`}
    >
      {initial}
    </div>
  );
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}
