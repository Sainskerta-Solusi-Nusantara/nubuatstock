import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ResearchReport } from "@/db/schema/research";

/**
 * PDF template untuk laporan riset Nubuat.
 *
 * Layout mengikuti pola laporan sekuritas sell-side standar (header + ringkasan +
 * thesis + valuasi + risiko + disclaimer). Original copy / branding milik Nubuat.
 *
 * Font: Inter (di-load via Google Fonts CDN — react-pdf butuh Font.register).
 */

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuLyfMZg.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuI6fMZg.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuGKYMZg.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuFuYMZg.ttf", fontWeight: 700 },
  ],
});

const PRIMARY = "#1f7a4f";    // green-teal
const BULL = "#1aa56b";
const BEAR = "#dc4c4c";
const MUTED = "#6b7280";
const FG = "#0f172a";
const BORDER = "#e5e7eb";
const BG_CARD = "#fafafa";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: FG,
    padding: 40,
    lineHeight: 1.5,
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: `2 solid ${PRIMARY}`,
    paddingBottom: 12,
    marginBottom: 16,
  },
  brand: { fontSize: 14, fontWeight: 700, color: PRIMARY },
  brandSub: { fontSize: 8, color: MUTED, marginTop: 2 },
  reportTypeBadge: {
    fontSize: 7,
    fontWeight: 600,
    backgroundColor: PRIMARY,
    color: "white",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Title block
  titleBlock: { marginBottom: 12 },
  ticker: {
    fontSize: 24,
    fontWeight: 700,
    color: FG,
    letterSpacing: -0.5,
  },
  companyName: { fontSize: 11, color: MUTED, marginTop: 2 },
  title: { fontSize: 16, fontWeight: 600, marginTop: 8 },
  // Recommendation strip
  recoStrip: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  recoCell: {
    flex: 1,
    backgroundColor: BG_CARD,
    border: `1 solid ${BORDER}`,
    borderRadius: 4,
    padding: 8,
  },
  recoLabel: {
    fontSize: 7,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recoValue: { fontSize: 12, fontWeight: 700, marginTop: 4 },
  // Sections
  sectionHeading: {
    fontSize: 11,
    fontWeight: 700,
    color: PRIMARY,
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: `1 solid ${BORDER}`,
  },
  paragraph: { fontSize: 10, marginBottom: 6, color: FG, textAlign: "justify" },
  bullet: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { width: 10, fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10 },
  // Financial table
  finTable: {
    border: `1 solid ${BORDER}`,
    borderRadius: 4,
    marginTop: 6,
  },
  finRow: {
    flexDirection: "row",
    borderBottom: `1 solid ${BORDER}`,
  },
  finRowLast: { flexDirection: "row" },
  finCellLabel: {
    flex: 2,
    fontSize: 9,
    color: MUTED,
    padding: 6,
  },
  finCellValue: {
    flex: 1,
    fontSize: 10,
    fontWeight: 600,
    padding: 6,
    textAlign: "right",
  },
  // Footer
  disclaimer: {
    fontSize: 7,
    color: MUTED,
    marginTop: 24,
    paddingTop: 8,
    borderTop: `1 solid ${BORDER}`,
    lineHeight: 1.4,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: MUTED,
  },
  bull: { color: BULL, fontWeight: 600 },
  bear: { color: BEAR, fontWeight: 600 },
  // Visualisasi target price
  priceVizContainer: {
    marginTop: 12,
    marginBottom: 16,
    padding: 12,
    backgroundColor: BG_CARD,
    border: `1 solid ${BORDER}`,
    borderRadius: 4,
  },
  priceVizLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  priceVizBarTrack: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    position: "relative",
    marginVertical: 14,
  },
  priceVizBarFill: {
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: 0,
    left: 0,
  },
  priceVizMarker: {
    position: "absolute",
    top: -6,
    width: 2,
    height: 20,
    backgroundColor: FG,
  },
  priceVizPin: {
    fontSize: 8,
    fontWeight: 600,
  },
  // Ratio bar (untuk financial snapshot)
  ratioBar: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 3,
    gap: 8,
  },
  ratioBarLabel: { width: 110, fontSize: 9, color: MUTED },
  ratioBarTrack: { flex: 1, height: 6, backgroundColor: "#e5e7eb", borderRadius: 3 },
  ratioBarFill: { height: 6, borderRadius: 3 },
  ratioBarValue: { width: 60, fontSize: 9, fontWeight: 600, textAlign: "right" },
});

const RATING_LABEL: Record<string, string> = {
  strong_buy: "STRONG BUY",
  buy: "BUY",
  hold: "HOLD",
  sell: "SELL",
  strong_sell: "STRONG SELL",
  not_rated: "NOT RATED",
};

const RATING_COLOR: Record<string, string> = {
  strong_buy: BULL,
  buy: BULL,
  hold: MUTED,
  sell: BEAR,
  strong_sell: BEAR,
  not_rated: MUTED,
};

const HORIZON_LABEL: Record<string, string> = {
  short_1_3m: "1–3 bulan",
  medium_3_12m: "3–12 bulan",
  long_12m_plus: "12+ bulan",
};

interface ReportPdfProps {
  report: ResearchReport;
  ticker?: string;
  companyName?: string;
  appName: string;
  disclaimer: string;
}

function formatIdr(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}

function formatPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n * (Math.abs(n) < 5 ? 100 : 1)).toFixed(2)}%`;
}

export function ResearchReportPDF({ report, ticker, companyName, appName, disclaimer }: ReportPdfProps) {
  const fin = report.financialSnapshot ?? {};
  const ratingColor = RATING_COLOR[report.rating] ?? MUTED;
  const upsidePct = report.upsideDownsidePct != null ? Number(report.upsideDownsidePct) : null;
  const upsideLabel =
    upsidePct == null
      ? "—"
      : `${upsidePct >= 0 ? "+" : ""}${(upsidePct * (Math.abs(upsidePct) < 5 ? 100 : 1)).toFixed(2)}%`;

  return (
    <Document
      title={report.title}
      author={report.authorName}
      subject={`Research report ${ticker ?? report.companyKode ?? ""}`}
      creator={`${appName} Research Platform`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{appName} Research</Text>
            <Text style={styles.brandSub}>Sains di balik setiap trade</Text>
          </View>
          <Text style={styles.reportTypeBadge}>{report.reportType.replace(/_/g, " ")}</Text>
        </View>

        {/* Title block */}
        <View style={styles.titleBlock}>
          {ticker && <Text style={styles.ticker}>{ticker}</Text>}
          {companyName && <Text style={styles.companyName}>{companyName}</Text>}
          <Text style={styles.title}>{report.title}</Text>
        </View>

        {/* Recommendation strip */}
        <View style={styles.recoStrip}>
          <View style={styles.recoCell}>
            <Text style={styles.recoLabel}>Rating</Text>
            <Text style={[styles.recoValue, { color: ratingColor }]}>
              {RATING_LABEL[report.rating] ?? "—"}
            </Text>
          </View>
          <View style={styles.recoCell}>
            <Text style={styles.recoLabel}>Target Price</Text>
            <Text style={styles.recoValue}>
              {report.targetPrice ? `Rp ${formatIdr(Number(report.targetPrice))}` : "—"}
            </Text>
          </View>
          <View style={styles.recoCell}>
            <Text style={styles.recoLabel}>Upside / Downside</Text>
            <Text style={[styles.recoValue, upsidePct != null ? (upsidePct >= 0 ? styles.bull : styles.bear) : {}]}>
              {upsideLabel}
            </Text>
          </View>
          <View style={styles.recoCell}>
            <Text style={styles.recoLabel}>Horizon</Text>
            <Text style={styles.recoValue}>{HORIZON_LABEL[report.timeHorizon]}</Text>
          </View>
          <View style={styles.recoCell}>
            <Text style={styles.recoLabel}>Harga Saat Publish</Text>
            <Text style={styles.recoValue}>
              {report.currentPriceAtPublish ? `Rp ${formatIdr(Number(report.currentPriceAtPublish))}` : "—"}
            </Text>
          </View>
        </View>

        {/* Visualisasi Target Price (kalau punya current + target) */}
        {report.currentPriceAtPublish && report.targetPrice && (
          <PriceTargetViz
            currentPrice={Number(report.currentPriceAtPublish)}
            targetPrice={Number(report.targetPrice)}
            rating={report.rating}
          />
        )}

        {/* Executive Summary */}
        <Text style={styles.sectionHeading}>Ringkasan Eksekutif</Text>
        <Text style={styles.paragraph}>{report.summary}</Text>
        {report.keyHighlights.length > 0 && (
          <View>
            {report.keyHighlights.map((h, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{h}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Catalysts */}
        {report.catalysts.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Katalis</Text>
            <View>
              {report.catalysts.map((c, i) => (
                <View key={i} style={styles.bullet}>
                  <Text style={styles.bulletDot}>▸</Text>
                  <Text style={styles.bulletText}>{c}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Body sections */}
        {report.sections.map((s) => (
          <View key={s.key}>
            <Text style={styles.sectionHeading}>{s.title}</Text>
            {/* Markdown rendering simple — split by newlines */}
            {s.content
              .split("\n\n")
              .filter((p) => p.trim())
              .map((para, i) => (
                <Text key={i} style={styles.paragraph}>
                  {para.trim()}
                </Text>
              ))}
          </View>
        ))}

        {/* Valuation */}
        {report.valuationMethod && (
          <>
            <Text style={styles.sectionHeading}>Metodologi Valuasi</Text>
            <Text style={styles.paragraph}>
              Metode: <Text style={{ fontWeight: 600 }}>{report.valuationMethod}</Text>
            </Text>
            {report.valuationDetail?.description && (
              <Text style={styles.paragraph}>{report.valuationDetail.description}</Text>
            )}
          </>
        )}

        {/* Financial Snapshot */}
        {Object.values(fin).some((v) => v != null) && (
          <>
            <Text style={styles.sectionHeading}>Snapshot Finansial</Text>
            <View style={styles.finTable}>
              <FinRow label="Revenue (TTM)" value={fin.revenue != null ? `Rp ${formatIdr(fin.revenue)}` : "—"} />
              <FinRow label="Revenue Growth YoY" value={formatPct(fin.revenueGrowth)} />
              <FinRow label="Net Income (TTM)" value={fin.netIncome != null ? `Rp ${formatIdr(fin.netIncome)}` : "—"} />
              <FinRow label="Net Income Growth YoY" value={formatPct(fin.netIncomeGrowth)} />
              <FinRow label="EPS" value={fin.eps != null ? `Rp ${formatIdr(fin.eps)}` : "—"} />
              <FinRow label="P/E Ratio" value={fin.pe != null ? `${fin.pe.toFixed(2)}x` : "—"} />
              <FinRow label="P/BV" value={fin.pbv != null ? `${fin.pbv.toFixed(2)}x` : "—"} />
              <FinRow label="ROE" value={formatPct(fin.roe)} />
              <FinRow label="DER" value={fin.debtToEquity != null ? `${fin.debtToEquity.toFixed(2)}x` : "—"} />
              <FinRow label="Dividend Yield" value={formatPct(fin.dividendYield)} last />
            </View>
          </>
        )}

        {/* Risk Factors */}
        {report.riskFactors.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Faktor Risiko</Text>
            <View>
              {report.riskFactors.map((r, i) => (
                <View key={i} style={styles.bullet}>
                  <Text style={[styles.bulletDot, { color: BEAR }]}>▲</Text>
                  <Text style={styles.bulletText}>{r}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer / Disclaimer */}
        <Text style={styles.disclaimer}>
          <Text style={{ fontWeight: 700 }}>Disclaimer. </Text>
          {disclaimer}{"\n\n"}
          Analis: {report.authorName} · Dipublikasikan{" "}
          {report.publishedAt ? new Date(report.publishedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}{" "}
          · © {new Date().getFullYear()} {appName}. Bukan ajakan jual/beli.
        </Text>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

function FinRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={last ? styles.finRowLast : styles.finRow}>
      <Text style={styles.finCellLabel}>{label}</Text>
      <Text style={styles.finCellValue}>{value}</Text>
    </View>
  );
}

/**
 * Visualisasi horizontal bar untuk target price:
 *   - Track abu-abu sebagai range
 *   - Fill berwarna (green untuk upside, red untuk downside)
 *   - Marker vertikal di posisi current price
 *   - Label angka di kedua ujung
 */
function PriceTargetViz({ currentPrice, targetPrice, rating }: { currentPrice: number; targetPrice: number; rating: string }) {
  const upside = (targetPrice - currentPrice) / currentPrice;
  const isPositive = upside >= 0;
  const fillColor = isPositive ? BULL : BEAR;

  // Range untuk visualisasi: ±50% dari current
  const low = currentPrice * 0.7;
  const high = Math.max(targetPrice * 1.05, currentPrice * 1.3);
  const range = high - low;
  const currentPct = ((currentPrice - low) / range) * 100;
  const targetPct = ((targetPrice - low) / range) * 100;
  const fillStart = Math.min(currentPct, targetPct);
  const fillWidth = Math.abs(targetPct - currentPct);

  return (
    <View style={styles.priceVizContainer}>
      <Text style={styles.priceVizLabel}>Price Target Visualization · {RATING_LABEL[rating] ?? rating}</Text>
      <View style={styles.priceVizBarTrack}>
        <View
          style={[
            styles.priceVizBarFill,
            { left: `${fillStart}%`, width: `${fillWidth}%`, backgroundColor: fillColor },
          ]}
        />
        {/* Marker current price */}
        <View style={[styles.priceVizMarker, { left: `${currentPct}%`, backgroundColor: FG }]} />
        {/* Marker target price */}
        <View style={[styles.priceVizMarker, { left: `${targetPct}%`, backgroundColor: fillColor }]} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
        <View>
          <Text style={[styles.priceVizPin, { color: FG }]}>Current</Text>
          <Text style={{ fontSize: 11, fontWeight: 700, color: FG }}>
            Rp {new Intl.NumberFormat("id-ID").format(currentPrice)}
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.priceVizPin, { color: fillColor }]}>{isPositive ? "▲" : "▼"} {(upside * 100).toFixed(2)}%</Text>
          <Text style={{ fontSize: 9, color: MUTED }}>upside</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.priceVizPin, { color: fillColor }]}>Target</Text>
          <Text style={{ fontSize: 11, fontWeight: 700, color: fillColor }}>
            Rp {new Intl.NumberFormat("id-ID").format(targetPrice)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Bar chart horizontal untuk financial ratios — visual snapshot tanpa harus
 * baca semua angka di tabel.
 */
function RatioBar({ label, value, normalized, fillColor = PRIMARY }: { label: string; value: string; normalized: number; fillColor?: string }) {
  const w = Math.max(2, Math.min(100, normalized * 100));
  return (
    <View style={styles.ratioBar}>
      <Text style={styles.ratioBarLabel}>{label}</Text>
      <View style={styles.ratioBarTrack}>
        <View style={[styles.ratioBarFill, { width: `${w}%`, backgroundColor: fillColor }]} />
      </View>
      <Text style={styles.ratioBarValue}>{value}</Text>
    </View>
  );
}
