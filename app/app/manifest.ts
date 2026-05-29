import type { MetadataRoute } from "next";

// PWA Web App Manifest for Nubuat. Served at /manifest.webmanifest and linked
// automatically by Next.js. Icons are generated on the fly via next/og route
// handlers (app/icons/icon-192, app/icons/icon-512) — no static assets needed.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nubuat — Analisis Saham Indonesia",
    short_name: "Nubuat",
    description:
      "Screener, daily picks, dan analisis teknikal untuk pasar saham Indonesia (IDX). Bukan rekomendasi investasi.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "id",
    dir: "ltr",
    background_color: "#0c1117",
    theme_color: "#0c1117",
    categories: ["finance", "business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
