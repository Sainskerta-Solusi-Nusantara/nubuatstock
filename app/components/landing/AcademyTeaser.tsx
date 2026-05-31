import Link from "next/link";
import {
  Award,
  Activity,
  Brain,
  Calculator,
  CandlestickChart,
  Coins,
  Compass,
  FileText,
  Globe,
  GraduationCap,
  Layers,
  Lock,
  LineChart,
  Radar,
  Rocket,
  ShieldCheck,
  Triangle,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { ACADEMY_MODULES, WMI_MODULE_SLUG } from "@/lib/academy/content";

const ICONS: Record<string, LucideIcon> = {
  GraduationCap,
  LineChart,
  Users,
  ShieldCheck,
  FileText,
  Compass,
  Award,
  Waves,
  Activity,
  Triangle,
  Calculator,
  CandlestickChart,
  Brain,
  Radar,
  Coins,
  Rocket,
  Globe,
  Layers,
};

/**
 * Teaser Academy di landing page (pemancing untuk pengunjung belum login).
 * Menampilkan grid modul belajar (kecuali WMI). Setiap kartu mengarah ke
 * /academy/modul/<slug> — untuk pengunjung anonim, gate (app) otomatis
 * mengarahkan ke /login dulu ("kalau mau nyoba harus login"); untuk yang sudah
 * login langsung membuka modulnya.
 */
export function AcademyTeaser() {
  const modules = ACADEMY_MODULES.filter((m) => m.slug !== WMI_MODULE_SLUG);
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);

  return (
    <section id="academy" className="scroll-mt-20 border-t border-border/60 bg-muted/20 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <GraduationCap className="size-3.5" />
            Nubuat Academy — Gratis
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Belajar saham dari nol sampai mahir
          </h2>
          <p className="mt-3 text-muted-foreground">
            {modules.length} modul terstruktur, {totalLessons}+ lesson singkat — dari dasar saham,
            analisis teknikal & fundamental, Wyckoff, Elliott Wave, candlestick, sampai psikologi &
            money management. <span className="font-medium text-foreground">Masuk untuk mulai belajar.</span>
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => {
            const Icon = ICONS[mod.icon] ?? GraduationCap;
            return (
              <Link
                key={mod.slug}
                href={`/academy/modul/${mod.slug}`}
                className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {mod.level}
                  </span>
                </div>
                <h3 className="mt-3 font-bold leading-snug group-hover:text-primary">{mod.title}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">
                  {mod.description}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{mod.lessons.length} lesson</span>
                  <span className="inline-flex items-center gap-1 text-primary opacity-0 transition group-hover:opacity-100">
                    <Lock className="size-3" /> Masuk untuk buka
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/login"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            <GraduationCap className="size-4" />
            Masuk & mulai belajar gratis
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">
            Belum punya akun?{" "}
            <Link href="/signup?trial=pro" className="text-primary underline">
              Daftar gratis
            </Link>{" "}
            — semua modul Academy bisa diakses tanpa biaya.
          </p>
        </div>
      </div>
    </section>
  );
}
