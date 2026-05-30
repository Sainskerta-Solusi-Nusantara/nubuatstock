import Image from "next/image";
import { getIcon } from "@/lib/landing/icon-map";
import type { FeatureItem } from "@/lib/landing/types";
import { FeatureGallery } from "./FeatureGallery";

export interface FeaturesProps {
  headlineLead: string;
  headlineHighlight: string;
  subtitle: string;
  items: FeatureItem[];
}

export function Features(props: FeaturesProps) {
  return (
    <section id="features" className="relative overflow-hidden py-20 sm:py-28">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-20">
        <Image
          src="https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1600&q=70&fm=webp&auto=format"
          alt=""
          fill
          sizes="100vw"
          className="object-cover blur-2xl"
        />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        {/* Galeri pratinjau fitur (gambar 1-7) — di ATAS heading. File di public/fitur/. */}
        <FeatureGallery />

        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {props.headlineLead} <span className="text-bull">{props.headlineHighlight}</span>
          </h2>
          <p className="mt-4 text-muted-foreground">{props.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {props.items.map((item) => {
            const Icon = getIcon(item.id);
            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {item.badge}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
