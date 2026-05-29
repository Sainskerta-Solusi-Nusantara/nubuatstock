import { ImageResponse } from "next/og";
import { getResearchBySlug, RATING_DISPLAY, REPORT_TYPE_LABEL } from "@/lib/research/service";

// Membaca DB (postgres-js) → runtime Node.js (default). Jangan set runtime edge.
export const alt = "Riset saham di Nubuat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: { slug: string };
}

// Warna brand untuk badge rating (hex, karena next/og tidak punya token Tailwind).
const RATING_HEX: Record<string, string> = {
  bull: "#34d399",
  bear: "#f87171",
  neutral: "#9aa7b2",
};

export default async function ResearchOgImage({ params }: Props) {
  const data = await getResearchBySlug(params.slug).catch(() => null);

  // Graceful fallback kalau riset tidak ada / DB kosong.
  const report = data?.report ?? null;
  const companyName = data?.companyName ?? null;
  const title = report?.title ?? "Riset Saham";
  const kode = report?.companyKode ?? null;
  const ratingInfo = report ? RATING_DISPLAY[report.rating] : null;
  const ratingLabel = ratingInfo?.label ?? null;
  const ratingColor = RATING_HEX[ratingInfo?.intent ?? "neutral"] ?? "#9aa7b2";
  const reportType = report ? (REPORT_TYPE_LABEL[report.reportType] ?? report.reportType) : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0c1117 0%, #111a22 60%, #0e1f1a 100%)",
          color: "#f2f5f7",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: brand + report type */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
            Nubuat · Riset
          </div>
          {reportType ? (
            <div
              style={{
                display: "flex",
                padding: "8px 18px",
                borderRadius: 999,
                border: "2px solid #3a4753",
                color: "#9aa7b2",
                fontSize: 24,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {reportType}
            </div>
          ) : null}
        </div>

        {/* Middle: company code + title */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {kode ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontSize: 40,
                fontWeight: 800,
                color: "#dbe4ea",
                letterSpacing: "-0.02em",
              }}
            >
              <span>{kode}</span>
              {companyName ? <span style={{ fontWeight: 500, color: "#9aa7b2", fontSize: 32 }}>· {companyName}</span> : null}
            </div>
          ) : null}
          <div
            style={{
              marginTop: 18,
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              maxWidth: 1040,
              display: "flex",
            }}
          >
            {title.length > 110 ? `${title.slice(0, 107)}…` : title}
          </div>
        </div>

        {/* Bottom: rating + caption */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {ratingLabel ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 24px",
                borderRadius: 999,
                border: `3px solid ${ratingColor}`,
                color: ratingColor,
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              {ratingLabel}
            </div>
          ) : (
            <div />
          )}
          <div style={{ display: "flex", fontSize: 24, color: "#5e6b76" }}>
            Edukasi, bukan rekomendasi investasi
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
