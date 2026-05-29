import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export interface TrialCTAProps {
  headline: string;
  description: string;
  cta: string;
  inclusions: string[];
}

export function TrialCTA(props: TrialCTAProps) {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 shadow-md sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{props.headline}</h2>
              <p className="mt-4 text-muted-foreground">{props.description}</p>

              <Link
                href="/signup?trial=pro"
                className="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition hover:shadow-lg hover:brightness-110"
              >
                {props.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                Lebih dari 5 fitur dibuka hari pertama. Setup kurang dari 5 menit.
              </p>
            </div>

            <ul className="space-y-3 text-sm">
              {props.inclusions.map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-bull" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
