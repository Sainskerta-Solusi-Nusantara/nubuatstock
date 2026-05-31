"use client";

import * as React from "react";
import Image from "next/image";
import { X, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";

/** Galeri pratinjau fitur — file di public/fitur/1.jpg .. 7.jpg. */
const GALLERY: Array<{ src: string; title: string; desc: string }> = [
  { src: "/fitur/1.jpg", title: "Nubuat Verdict per Emiten", desc: "Skor 0-10 dari 6 faktor (teknikal, momentum, value, quality, growth, sentimen) — transparan, lengkap dengan alasannya." },
  { src: "/fitur/2.jpg", title: "Compare Emiten", desc: "Bandingkan beberapa saham berdampingan: fundamental side-by-side + Verdict tiap emiten." },
  { src: "/fitur/3.jpg", title: "Sector Heatmap", desc: "Performa 11 sektor IDX dalam satu layar — ukuran sel ikut market cap, warna ikut return." },
  { src: "/fitur/4.jpg", title: "AI Buddy", desc: "Tanya apa saja soal saham IDX — jawaban berbasis data, lengkap dengan sumber. Ada Deep Mode." },
  { src: "/fitur/5.jpg", title: "Academy", desc: "Belajar dari nol sampai mahir: dasar saham, teknikal, Wyckoff, Elliott Wave, sampai persiapan WMI." },
  { src: "/fitur/6.jpg", title: "Rotation (RRG)", desc: "Relative Rotation Graph: petakan sektor ke kuadran Leading / Improving / Weakening / Lagging." },
  { src: "/fitur/7.jpg", title: "Guidance — Cara Pakai", desc: "Panduan lengkap tiap fitur: baca Verdict, Wyckoff, bandarmology, screener, sampai AI Buddy." },
];

export function FeatureGallery() {
  const [active, setActive] = React.useState<number | null>(null);
  const [zoomed, setZoomed] = React.useState(false);

  const close = React.useCallback(() => {
    setActive(null);
    setZoomed(false);
  }, []);
  const go = React.useCallback((dir: 1 | -1) => {
    setZoomed(false);
    setActive((cur) => (cur === null ? cur : (cur + dir + GALLERY.length) % GALLERY.length));
  }, []);

  // Keyboard: Esc tutup, ←/→ navigasi.
  React.useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    // Cegah scroll background saat lightbox terbuka.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active, close, go]);

  const cur = active === null ? null : GALLERY[active]!;

  return (
    <>
      <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {GALLERY.map((g, i) => (
          <figure
            key={g.src}
            className={`overflow-hidden rounded-xl border border-border bg-card shadow-sm ${
              i === 6 ? "sm:col-span-2 lg:col-span-1" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setActive(i);
                setZoomed(false);
              }}
              aria-label={`Perbesar gambar: ${g.title}`}
              className="group relative block aspect-[16/10] w-full cursor-zoom-in bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Image
                src={g.src}
                alt={g.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                <ZoomIn className="size-7 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
              </span>
            </button>
            <figcaption className="p-4">
              <h3 className="text-sm font-semibold">{g.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.desc}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Lightbox */}
      {cur && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={cur.title}
          onClick={close}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          {/* Tombol tutup */}
          <button
            type="button"
            onClick={close}
            aria-label="Tutup"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X className="size-5" />
          </button>

          {/* Prev */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Sebelumnya"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-4"
          >
            <ChevronLeft className="size-6" />
          </button>
          {/* Next */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Berikutnya"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-4"
          >
            <ChevronRight className="size-6" />
          </button>

          {/* Gambar — klik untuk toggle zoom */}
          <div
            className={`relative flex max-h-[80vh] w-full max-w-5xl items-center justify-center ${
              zoomed ? "overflow-auto" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cur.src}
              alt={cur.title}
              onClick={() => setZoomed((z) => !z)}
              className={`mx-auto rounded-lg object-contain transition-transform duration-200 ${
                zoomed ? "max-w-none cursor-zoom-out scale-[1.8]" : "max-h-[80vh] w-auto cursor-zoom-in"
              }`}
            />
          </div>

          {/* Caption */}
          <div
            className="mt-4 max-w-2xl text-center text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">{cur.title}</h3>
            <p className="mt-1 text-sm text-white/70">{cur.desc}</p>
            <p className="mt-2 text-xs text-white/40">
              {active! + 1} / {GALLERY.length} · klik gambar untuk zoom · ← → untuk navigasi · Esc untuk tutup
            </p>
          </div>
        </div>
      )}
    </>
  );
}
