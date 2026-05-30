import Image from "next/image";
import { getIcon } from "@/lib/landing/icon-map";
import type { FeatureItem } from "@/lib/landing/types";

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

/** Galeri pratinjau fitur — taruh file di public/fitur/1.jpg .. 7.jpg. */
const GALLERY: Array<{ src: string; title: string; desc: string }> = [
  { src: "/fitur/1.jpg", title: "Dashboard & Daily Picks", desc: "Ringkasan pasar + saham pilihan harian lengkap dengan entry, stop loss, dan target." },
  { src: "/fitur/2.jpg", title: "Analisis Per Emiten", desc: "Verdict 0–10, teknikal, fundamental, dan bandarmology dalam satu halaman." },
  { src: "/fitur/3.jpg", title: "Elliott Wave Otomatis", desc: "Hitung wave count + narasi AI Bahasa Indonesia untuk baca skenario harga." },
  { src: "/fitur/4.jpg", title: "AI Buddy", desc: "Tanya apa saja soal saham IDX — jawaban berbasis data, lengkap dengan sumber." },
  { src: "/fitur/5.jpg", title: "Screener & Rotasi Sektor", desc: "Saring emiten sesuai kriteria + lihat rotasi sektor (RRG) & heatmap." },
  { src: "/fitur/6.jpg", title: "Paper Trading & Hall of Fame", desc: "Latihan trading modal virtual Rp100jt, adu peringkat di leaderboard." },
  { src: "/fitur/7.jpg", title: "Backtest & Alert", desc: "Uji strategi (walk-forward + Monte Carlo) dan pasang alert harga." },
];

function FeatureGallery() {
  return (
    <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {GALLERY.map((g, i) => (
        <figure
          key={g.src}
          className={`overflow-hidden rounded-xl border border-border bg-card shadow-sm ${
            i === 6 ? "sm:col-span-2 lg:col-span-1" : ""
          }`}
        >
          <div className="relative aspect-[16/10] w-full bg-muted">
            <Image
              src={g.src}
              alt={g.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          </div>
          <figcaption className="p-4">
            <h3 className="text-sm font-semibold">{g.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.desc}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
