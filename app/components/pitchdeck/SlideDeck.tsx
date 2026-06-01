"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Maximize2, Download, Presentation } from "lucide-react";
import type { Slide } from "@/lib/pitchdeck/deck";

/**
 * Penampil pitchdeck mode slide 16:9.
 *
 * - Navigasi keyboard: ← / → / Space / PageUp / PageDown / Home / End.
 * - Stage selalu rasio 16:9, di-scale agar muat viewport (letterbox).
 * - Tombol "Download PDF" memicu window.print(); CSS @media print merender
 *   semua slide bertumpuk, satu slide = satu halaman landscape.
 * - Fullscreen via Fullscreen API.
 */
export function SlideDeck({ slides }: { slides: Slide[] }) {
  const [i, setI] = React.useState(0);
  const total = slides.length;
  const stageRef = React.useRef<HTMLDivElement>(null);

  const go = React.useCallback(
    (next: number) => setI((cur) => Math.max(0, Math.min(total - 1, next ?? cur))),
    [total],
  );

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          go(i + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          go(i - 1);
          break;
        case "Home":
          e.preventDefault();
          go(0);
          break;
        case "End":
          e.preventDefault();
          go(total - 1);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go, total]);

  function toggleFullscreen() {
    const el = stageRef.current?.parentElement ?? document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0c1117] text-white">
      {/* Stage 16:9 — screen only */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-8 print:hidden">
        <div
          ref={stageRef}
          className="relative aspect-video w-full max-w-[1280px] overflow-hidden rounded-xl border border-white/10 shadow-2xl"
          style={{ maxHeight: "100%" }}
        >
          <SlideView slide={slides[i]!} index={i} total={total} />
        </div>

        {/* Prev / Next overlay buttons */}
        <button
          type="button"
          onClick={() => go(i - 1)}
          disabled={i === 0}
          aria-label="Slide sebelumnya"
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 backdrop-blur transition hover:bg-white/20 disabled:opacity-20 sm:left-4"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => go(i + 1)}
          disabled={i === total - 1}
          aria-label="Slide berikutnya"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 backdrop-blur transition hover:bg-white/20 disabled:opacity-20 sm:right-4"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Control bar — screen only */}
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/30 px-4 py-3 print:hidden">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Presentation className="h-4 w-4 text-primary" />
          <span className="font-semibold text-white">Nubuat</span>
          <span className="hidden sm:inline">· Pitchdeck</span>
        </div>

        {/* Dots */}
        <div className="hidden items-center gap-1.5 md:flex">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => go(idx)}
              aria-label={`Ke slide ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-5 bg-primary" : "w-1.5 bg-white/25 hover:bg-white/50"}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-white/60">
            {i + 1} / {total}
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label="Layar penuh"
            className="rounded-md border border-white/15 p-1.5 transition hover:bg-white/10"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium transition hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span> PDF
          </button>
        </div>
      </div>

      {/* Print render — all slides stacked, one per landscape page */}
      <div className="hidden print:block">
        {slides.map((s, idx) => (
          <div key={idx} className="print-slide">
            <SlideView slide={s} index={idx} total={total} />
          </div>
        ))}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page { size: 1280px 720px; margin: 0; }
        @media print {
          html, body { background: #0c1117 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-slide { width: 1280px; height: 720px; page-break-after: always; position: relative; overflow: hidden; }
          .print-slide:last-child { page-break-after: auto; }
        }
      `,
        }}
      />
    </div>
  );
}

/* ───────── Single slide renderer ───────── */

function SlideView({ slide, index, total }: { slide: Slide; index: number; total: number }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-br from-[#0c1117] via-[#0f1722] to-[#0c1117]">
      {/* accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/60 to-transparent" />

      <div className="flex flex-1 flex-col justify-center px-[6%] py-[4%]">
        {slide.kind === "cover" && <CoverSlide s={slide} />}
        {slide.kind === "closing" && <ClosingSlide s={slide} />}
        {slide.kind === "stat-grid" && <StatGridSlide s={slide} />}
        {slide.kind === "bullets" && <BulletsSlide s={slide} />}
        {slide.kind === "table" && <TableSlide s={slide} />}
      </div>

      {/* footer */}
      {slide.kind !== "cover" && (
        <div className="flex items-center justify-between px-[6%] pb-[3%] text-[clamp(9px,1vw,13px)] text-white/35">
          <span>Nubuat · Confidential</span>
          <span className="font-mono">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
      )}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-[2%] inline-flex w-fit items-center rounded-full bg-primary/15 px-3 py-1 text-[clamp(9px,1vw,13px)] font-semibold uppercase tracking-widest text-primary">
      {children}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[clamp(20px,3.2vw,44px)] font-bold leading-tight tracking-tight">{children}</h2>;
}

function CoverSlide({ s }: { s: Extract<Slide, { kind: "cover" }> }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <h1 className="text-[clamp(48px,9vw,128px)] font-extrabold leading-none tracking-tighter">
        {s.title}
        <span className="text-primary">.</span>
      </h1>
      <p className="mt-[2%] max-w-[80%] text-[clamp(15px,2.2vw,30px)] font-medium leading-snug text-white/85">
        {s.subtitle}
      </p>
      <p className="mt-[3%] max-w-[75%] text-[clamp(10px,1.3vw,17px)] leading-relaxed text-white/45">
        {s.footnote}
      </p>
    </div>
  );
}

function ClosingSlide({ s }: { s: Extract<Slide, { kind: "closing" }> }) {
  return (
    <div className="flex h-full flex-col justify-center">
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <Title>{s.title}</Title>
      <p className="mt-[2%] max-w-[80%] text-[clamp(13px,1.7vw,22px)] leading-snug text-white/80">{s.subtitle}</p>
      <ul className="mt-[3%] space-y-[1.5%]">
        {s.points.map((p) => (
          <li key={p} className="flex items-center gap-3 text-[clamp(11px,1.5vw,20px)] text-white/90">
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-[4%] inline-flex w-fit items-center rounded-lg bg-primary px-5 py-2.5 text-[clamp(13px,1.7vw,22px)] font-bold text-primary-foreground">
        {s.cta}
      </div>
    </div>
  );
}

function StatGridSlide({ s }: { s: Extract<Slide, { kind: "stat-grid" }> }) {
  const cols = s.stats.length <= 4 ? s.stats.length : 4;
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <Title>{s.title}</Title>
      <div
        className="mt-[3%] grid flex-1 content-start gap-[1.5%]"
        style={{ gridTemplateColumns: `repeat(${Math.min(cols, s.stats.length <= 4 ? cols : 4)}, minmax(0, 1fr))` }}
      >
        {s.stats.map((st) => (
          <div key={st.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-[3%]">
            <div className="font-mono text-[clamp(18px,2.6vw,38px)] font-bold text-primary">{st.value}</div>
            <div className="mt-1 text-[clamp(10px,1.25vw,17px)] font-semibold leading-snug">{st.label}</div>
            {st.detail && (
              <div className="mt-1 text-[clamp(8px,0.95vw,13px)] leading-snug text-white/45">{st.detail}</div>
            )}
          </div>
        ))}
      </div>
      {s.note && (
        <p className="mt-[2%] rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[clamp(9px,1.1vw,15px)] leading-snug text-white/80">
          {s.note}
        </p>
      )}
    </>
  );
}

function BulletsSlide({ s }: { s: Extract<Slide, { kind: "bullets" }> }) {
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <Title>{s.title}</Title>
      {s.intro && (
        <p className="mt-[1.5%] max-w-[85%] text-[clamp(10px,1.3vw,18px)] leading-snug text-white/65">{s.intro}</p>
      )}
      <div className="mt-[3%] grid flex-1 content-start gap-[1.5%] sm:grid-cols-2">
        {s.bullets.map((b) => (
          <div key={b.head} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-[2.5%]">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
            <div>
              <div className="text-[clamp(11px,1.35vw,19px)] font-bold leading-snug">{b.head}</div>
              <div className="mt-0.5 text-[clamp(8.5px,1.05vw,15px)] leading-snug text-white/55">{b.body}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TableSlide({ s }: { s: Extract<Slide, { kind: "table" }> }) {
  return (
    <>
      <Eyebrow>{s.eyebrow}</Eyebrow>
      <Title>{s.title}</Title>
      <div className="mt-[2.5%] flex-1 overflow-hidden">
        <table className="w-full border-collapse text-[clamp(8px,1.05vw,15px)]">
          <thead>
            <tr className="border-b border-white/20 text-left uppercase tracking-wider text-white/45">
              {s.columns.map((c) => (
                <th key={c} className="px-2 py-[1%] font-semibold">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-white/8 align-top">
                {row.map((cell, ci) => (
                  <td key={ci} className={`px-2 py-[0.9%] leading-snug ${ci === 0 ? "font-semibold text-primary" : "text-white/80"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {s.note && (
        <p className="mt-[1.5%] rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[clamp(8.5px,1.05vw,14px)] leading-snug text-white/80">
          {s.note}
        </p>
      )}
    </>
  );
}
