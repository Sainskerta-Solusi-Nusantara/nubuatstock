import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GuidanceSectionView } from "@/components/guidance/GuidanceContent";
import {
  GUIDANCE_CATEGORIES,
  GUIDANCE_SECTIONS,
  type GuidanceSection,
} from "@/lib/guidance/content";

export const metadata = {
  title: "Guidance — Nubuat",
  description:
    "Panduan lengkap cara pakai Nubuat: cara baca verdict, wyckoff, bandarmology, DCF, screener, dan semua modul lainnya.",
};

export default function GuidancePage() {
  // Group sections by category
  const byCategory = new Map<string, GuidanceSection[]>();
  for (const c of GUIDANCE_CATEGORIES) byCategory.set(c, []);
  for (const s of GUIDANCE_SECTIONS) {
    const arr = byCategory.get(s.category) ?? [];
    arr.push(s);
    byCategory.set(s.category, arr);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Sticky TOC sidebar — desktop */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-md border border-border bg-card p-3 text-sm">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            Daftar Isi
          </div>
          <nav className="space-y-3">
            {GUIDANCE_CATEGORIES.map((cat) => {
              const items = byCategory.get(cat) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                    {cat}
                  </div>
                  <ul className="space-y-0.5">
                    {items.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="block rounded px-1.5 py-1 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="space-y-6">
        <header>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Guidance</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Panduan lengkap cara pakai Nubuat — dari dashboard, daily picks, verdict scoring, wyckoff
            phase, bandarmology, DCF, screener, sampai AI Buddy. Setiap fitur dijelaskan dengan cara baca + workflow + tips.
          </p>
        </header>

        {/* Quick start callout */}
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold">Quick Start untuk pemula</h3>
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>
                    <strong>1.</strong> Buka <Link href="/" className="text-primary underline">Dashboard</Link> — lihat Daily Picks hari ini sebagai starting point.
                  </li>
                  <li>
                    <strong>2.</strong> Klik 1 pick → masuk halaman ticker → cek <em>Nubuat Verdict</em> (target ≥ 6.5) dan <em>Wyckoff Phase</em> (Accumulation/Markup = OK).
                  </li>
                  <li>
                    <strong>3.</strong> Validasi fundamentals di tab Fundamental — cek <em>DCF margin of safety</em>.
                  </li>
                  <li>
                    <strong>4.</strong> Cek sentimen di tab News. Tambah ke <Link href="/watchlist" className="text-primary underline">Watchlist</Link> + set <Link href="/alerts" className="text-primary underline">Alert</Link>.
                  </li>
                  <li>
                    <strong>5.</strong> Mau cari emiten lain? Pakai <Link href="/screener" className="text-primary underline">Screener</Link> dengan preset, atau tanya <Link href="/copilot" className="text-primary underline">AI Buddy</Link>.
                  </li>
                </ol>
                <div className="mt-3 text-xs text-muted-foreground">
                  <strong>Pro tip:</strong> Tekan <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">Cmd+K</kbd> (Mac) atau <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">Ctrl+K</kbd> (Win) dari halaman mana pun untuk Command Palette ala Bloomberg.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile TOC */}
        <Card className="lg:hidden">
          <CardContent className="p-3">
            <details>
              <summary className="cursor-pointer text-sm font-semibold">📑 Daftar Isi (tap)</summary>
              <nav className="mt-3 space-y-3">
                {GUIDANCE_CATEGORIES.map((cat) => {
                  const items = byCategory.get(cat) ?? [];
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {cat}
                      </div>
                      <ul className="space-y-0.5">
                        {items.map((s) => (
                          <li key={s.id}>
                            <a href={`#${s.id}`} className="text-xs text-muted-foreground hover:underline">
                              {s.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </nav>
            </details>
          </CardContent>
        </Card>

        {/* Sections grouped */}
        {GUIDANCE_CATEGORIES.map((cat) => {
          const items = byCategory.get(cat) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={cat} className="space-y-6">
              {items.map((s) => (
                <GuidanceSectionView key={s.id} section={s} />
              ))}
            </section>
          );
        })}

        {/* Footer */}
        <Card className="bg-card/40">
          <CardContent className="p-4 text-center text-xs text-muted-foreground">
            <p>
              Pertanyaan lebih lanjut? Tanya <Link href="/copilot" className="text-primary underline">AI Buddy</Link>{" "}
              atau email <a href="mailto:support@nubuat.id" className="text-primary underline">support@nubuat.id</a>.
            </p>
            <p className="mt-1">
              Dokumentasi ini akan terus di-update. Saran perbaikan?{" "}
              <Link href="mailto:product@nubuat.id" className="text-primary underline">
                product@nubuat.id
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
