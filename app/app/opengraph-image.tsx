import { ImageResponse } from "next/og";

// Default Open Graph image for Nubuat (built at request time via next/og).
export const runtime = "edge";
export const alt = "Nubuat — Analisis saham Indonesia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          background: "linear-gradient(135deg, #0c1117 0%, #111a22 100%)",
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
          Nubuat
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            maxWidth: 920,
          }}
        >
          Analisis saham Indonesia
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 32,
            color: "#9aa7b2",
            maxWidth: 880,
          }}
        >
          Screener, daily picks, dan analisis teknikal untuk pasar IDX.
        </div>
        <div
          style={{
            marginTop: 64,
            fontSize: 22,
            color: "#5e6b76",
          }}
        >
          Bukan rekomendasi investasi. Untuk tujuan edukasi.
        </div>
      </div>
    ),
    { ...size },
  );
}
