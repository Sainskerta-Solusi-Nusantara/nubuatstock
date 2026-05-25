import Image from "next/image";
import type { Step } from "@/lib/landing/types";

export interface HowItWorksProps {
  headlineLead: string;
  headlineHighlight: string;
  subtitle: string;
  steps: Step[];
}

export function HowItWorks(props: HowItWorksProps) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 w-1/2 opacity-15">
        <Image
          src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200&q=70&fm=webp&auto=format"
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
        />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {props.headlineLead} <span className="text-bull">{props.headlineHighlight}</span>
          </h2>
          <p className="mt-4 text-muted-foreground">{props.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {props.steps.map((s) => (
            <div key={s.n} className="flex gap-5 rounded-xl border border-border bg-card p-6 transition hover:border-primary/40">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono font-bold">
                {s.n}
              </div>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
