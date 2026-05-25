import { getIcon } from "@/lib/landing/icon-map";
import type { PainpointItem } from "@/lib/landing/types";

export interface PainpointsProps {
  headlineLead: string;
  headlineHighlight: string;
  subtitle: string;
  items: PainpointItem[];
  footnote: string;
}

export function Painpoints(props: PainpointsProps) {
  return (
    <section className="relative border-y border-border/60 bg-card/30 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {props.headlineLead} <span className="text-bear">{props.headlineHighlight}</span>
          </h2>
          <p className="mt-4 text-muted-foreground">{props.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {props.items.map((item) => {
            const Icon = getIcon(item.id);
            return (
              <div
                key={item.id}
                className="rounded-lg border border-border bg-card p-6 transition hover:border-bear/40 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-bear-soft text-bear">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted-foreground">
          {props.footnote}
        </p>
      </div>
    </section>
  );
}
