import type { FaqItem } from "@/lib/landing/types";

export interface FAQProps {
  headline: string;
  items: FaqItem[];
}

export function FAQ(props: FAQProps) {
  return (
    <section className="relative border-t border-border/60 bg-card/30 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">{props.headline}</h2>

        <div className="mt-12 space-y-4">
          {props.items.map((item) => (
            <details
              key={item.q}
              className="group rounded-lg border border-border bg-background p-5 transition open:border-primary/40 open:shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">
                <span>{item.q}</span>
                <span className="text-muted-foreground transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
