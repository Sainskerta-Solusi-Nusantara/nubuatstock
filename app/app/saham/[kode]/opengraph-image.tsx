import { ImageResponse } from "next/og";
import { eq, desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { companies } from "@/db/schema/companies";
import { quotesEod } from "@/db/schema/market";
import { sectors } from "@/db/schema/reference";

// Membaca DB (postgres-js) → harus runtime Node.js (default). Jangan set edge.
export const alt = "Analisis Saham — Nubuat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = { params: Promise<{ kode: string }> };

export default async function Image({ params }: Params) {
  const { kode: raw } = await params;
  const kode = (raw || "").toUpperCase();

  const company = await db
    .select({ nama: companies.namaPerusahaan, sektorNama: sectors.namaId })
    .from(companies)
    .leftJoin(sectors, eq(companies.sectorKode, sectors.kode))
    .where(eq(companies.kode, kode))
    .limit(1)
    .then((r) => r[0] ?? null)
    .catch(() => null);

  const quote = await db
    .select({ close: quotesEod.close })
    .from(quotesEod)
    .where(eq(quotesEod.companyKode, kode))
    .orderBy(desc(quotesEod.tradeDate))
    .limit(1)
    .then((r) => r[0] ?? null)
    .catch(() => null);

  const nama = company?.nama ?? "";
  const sektor = company?.sektorNama ?? "";
  const harga =
    quote?.close != null
      ? `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
          Number(quote.close),
        )}`
      : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0c1117 0%, #111a22 60%, #0e1f1a 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 38,
            color: "#34d399",
            fontWeight: 700,
            marginBottom: 20,
          }}
        >
          Nubuat · Analisis Saham IDX
        </div>
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -2 }}>
          {kode}
        </div>
        <div style={{ fontSize: 46, opacity: 0.9, marginTop: 10 }}>{nama}</div>
        <div
          style={{
            display: "flex",
            gap: 30,
            marginTop: 30,
            alignItems: "baseline",
          }}
        >
          {harga ? (
            <div style={{ fontSize: 52, fontWeight: 700 }}>{harga}</div>
          ) : null}
          {sektor ? (
            <div style={{ fontSize: 30, opacity: 0.6 }}>{sektor}</div>
          ) : null}
        </div>
        <div style={{ fontSize: 26, opacity: 0.5, marginTop: "auto" }}>
          Harga · Fundamental · Profil Emiten
        </div>
      </div>
    ),
    { ...size },
  );
}
