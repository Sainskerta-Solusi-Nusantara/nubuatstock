import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { Stat } from "@/lib/landing/types";

export interface HeroProps {
  appName: string;
  tagline: string;
  badge: string;
  headlineLead: string;
  headlineBearish: string;
  headlineMiddle: string;
  headlineBullish: string;
  headlineTail: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaNote: string;
  stats: Stat[];
  backgroundImage: string;
}

export function Hero(props: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/80" />
      <div aria-hidden="true" className="absolute inset-0 opacity-40 dark:opacity-25">
        <Image
          src={props.backgroundImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-32">
        <div className="flex flex-col items-center text-center">
          <Badge variant="outline" className="mb-6 gap-1.5 border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            {props.badge}
          </Badge>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            {props.headlineLead} <span className="text-bear">{props.headlineBearish}</span>
            <br />
            {props.headlineMiddle} <span className="text-bull">{props.headlineBullish}</span> {props.headlineTail}
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            {props.appName} {props.subheadline} {props.tagline}.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/signup?trial=starter"
              className={cn(
                "group inline-flex items-center justify-center gap-2",
                "h-12 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground",
                "shadow-md transition-all hover:shadow-lg hover:brightness-110",
              )}
            >
              {props.ctaPrimary}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-semibold transition hover:bg-accent"
            >
              {props.ctaSecondary}
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">{props.ctaNote}</p>

          <div className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-6 border-t border-border/60 pt-10 sm:grid-cols-4">
            {props.stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-mono tabular text-2xl font-bold tracking-tight sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
