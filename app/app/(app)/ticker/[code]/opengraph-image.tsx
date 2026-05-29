import { ImageResponse } from "next/og";
import { getCompany } from "@/lib/companies";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { tickerSchema } from "@/lib/types/companies";
import type { CompanyDetailDTO } from "@/lib/types/companies";

// Catatan: route ini membaca DB (postgres-js) → harus runtime Node.js (default),
// BUKAN edge. Jangan set `runtime = "edge"`.
export const alt = "Analisis saham di Nubuat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Props {
  params: { code: string };
}

async function loadCompany(kode: string): Promise<CompanyDetailDTO | null> {
  try {
    return await getCompany(kode);
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    logger.warn({ err, kode }, "opengraph-image loadCompany failed");
    return null;
  }
}

export default async function TickerOgImage({ params }: Props) {
  const parsed = tickerSchema.safeParse(params.code.toUpperCase());
  const normalized = parsed.success ? parsed.data : params.code.toUpperCase();

  // Graceful: kalau data minim / DB kosong, tetap render kartu dengan kode saja.
  const company = parsed.success ? await loadCompany(normalized) : null;
  const kode = company?.kode ?? normalized;
  const nama = company?.namaPerusahaan ?? "Saham Indonesia";
  const sektor = company?.sectorNamaId ?? company?.sectorKode ?? null;
  const papan = company?.papanNama ?? company?.papanKode ?? null;
  const isSyariah = company?.isSyariah ?? false;

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
        {/* Top: brand */}
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

        {/* Middle: ticker + name */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                fontSize: 120,
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              {kode}
            </div>
            {isSyariah ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginTop: 18,
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: "2px solid #34d399",
                  color: "#34d399",
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                Syariah
              </div>
            ) : null}
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 44,
              fontWeight: 600,
              color: "#dbe4ea",
              maxWidth: 1040,
              lineHeight: 1.1,
            }}
          >
            {nama}
          </div>
          {sektor || papan ? (
            <div
              style={{
                marginTop: 18,
                fontSize: 30,
                color: "#9aa7b2",
              }}
            >
              {[sektor, papan].filter(Boolean).join("  •  ")}
            </div>
          ) : null}
        </div>

        {/* Bottom: caption */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 24,
            color: "#5e6b76",
          }}
        >
          <div>Analisis teknikal, fundamental, bandarmologi &amp; AI</div>
          <div>Edukasi, bukan rekomendasi investasi</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
