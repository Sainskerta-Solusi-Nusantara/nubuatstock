import { ImageResponse } from "next/og";

// Statis, tanpa akses DB → aman di edge runtime (mengikuti app/opengraph-image.tsx).
export const runtime = "edge";
export const alt = "Glossary Saham — Kamus Istilah Trading & Investasi | Nubuat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function GlossaryOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0c1117 0%, #111a22 60%, #0e1f1a 100%)",
          color: "#f2f5f7",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 34,
            fontWeight: 700,
            color: "#34d399",
            letterSpacing: "-0.02em",
          }}
        >
          Nubuat · Edukasi
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: 1000,
          }}
        >
          Glossary Saham
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            color: "#9aa7b2",
            maxWidth: 980,
            lineHeight: 1.25,
          }}
        >
          Kamus istilah trading &amp; investasi: IHSG, ARA/ARB, bandarmologi, Elliott Wave, dan ratusan istilah lain — dijelaskan singkat &amp; ramah pemula.
        </div>
        <div style={{ marginTop: 56, fontSize: 24, color: "#5e6b76" }}>
          nubuat — analisis saham Indonesia
        </div>
      </div>
    ),
    { ...size },
  );
}
