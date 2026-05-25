import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";

import { groupByCategory, type PitchdeckFeature } from "./features";

/**
 * Feature Guide PDF — penjelasan fitur Nubuat lengkap dengan screenshot.
 *
 * Layout per fitur: 1 halaman A4 portrait.
 *   - Header: kategori + judul + tier badge
 *   - Screenshot (full-width, max 360pt height)
 *   - Elevator pitch (paragraph)
 *   - Highlights bullet list
 *   - Footer: page number + branding
 *
 * Screenshot di-pass sebagai data URI (base64 PNG) supaya PDF self-contained.
 */

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuLyfMZg.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuI6fMZg.ttf",
      fontWeight: 500,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuGKYMZg.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50ojIw2boKoduKmMEVuFuYMZg.ttf",
      fontWeight: 700,
    },
  ],
});

const PRIMARY = "#1f7a4f";
const FG = "#0f172a";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const BG_SUBTLE = "#f9fafb";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: FG,
    padding: 36,
    lineHeight: 1.5,
  },
  // Cover
  cover: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    textAlign: "center",
  },
  coverEyebrow: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 14,
    color: MUTED,
    maxWidth: 380,
    marginBottom: 32,
    lineHeight: 1.6,
  },
  coverMeta: {
    fontSize: 9,
    color: MUTED,
    marginTop: 32,
  },
  coverDivider: {
    width: 60,
    height: 3,
    backgroundColor: PRIMARY,
    marginVertical: 20,
  },
  // TOC
  tocTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 20,
  },
  tocSectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 14,
    marginBottom: 6,
  },
  tocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottom: `0.5pt dotted ${BORDER}`,
  },
  tocText: { fontSize: 10, color: FG },
  tocPage: { fontSize: 10, color: MUTED },
  // Feature page
  categoryBadge: {
    fontSize: 9,
    color: PRIMARY,
    fontWeight: 600,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 4,
  },
  featurePath: {
    fontSize: 9,
    color: MUTED,
    fontFamily: "Inter",
    marginBottom: 12,
  },
  screenshotBox: {
    borderRadius: 4,
    overflow: "hidden",
    border: `1pt solid ${BORDER}`,
    marginBottom: 14,
    backgroundColor: BG_SUBTLE,
  },
  screenshot: {
    width: "100%",
    objectFit: "contain",
  },
  screenshotMissing: {
    width: "100%",
    height: 220,
    backgroundColor: BG_SUBTLE,
    color: MUTED,
    fontSize: 10,
    textAlign: "center",
    paddingTop: 100,
  },
  pitch: {
    fontSize: 11,
    color: FG,
    marginBottom: 14,
    lineHeight: 1.55,
  },
  highlightsHeader: {
    fontSize: 10,
    fontWeight: 600,
    color: PRIMARY,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bullet: {
    width: 10,
    fontSize: 10,
    color: PRIMARY,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: FG,
    lineHeight: 1.5,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: MUTED,
  },
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 600,
    color: "#fff",
  },
});

const TIER_COLOR: Record<NonNullable<PitchdeckFeature["tier"]>, string> = {
  open: "#6b7280",
  starter: "#0ea5e9",
  pro: "#1f7a4f",
  elite: "#a855f7",
};

interface Props {
  /** Screenshot data URIs by slug. Slug yang tidak ada → placeholder rendered. */
  screenshots: Record<string, string>;
  /** Tanggal generate untuk metadata cover. */
  generatedAt: Date;
  /** Optional override total fitur (display only). */
  featureCount?: number;
}

function Footer({ pageLabel }: { pageLabel: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>Nubuat · Feature Guide</Text>
      <Text>{pageLabel}</Text>
      <Text>nubuat.id</Text>
    </View>
  );
}

export function FeaturePdf({ screenshots, generatedAt, featureCount }: Props) {
  const grouped = groupByCategory();
  const total = featureCount ?? grouped.reduce((sum, g) => sum + g.items.length, 0);
  const dateStr = generatedAt.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // TOC perlu menghitung page number. Cover = page 1, TOC = page 2,
  // feature pages mulai page 3.
  let cursor = 3;
  const tocEntries = grouped.map((group) => {
    const items = group.items.map((feature) => {
      const entry = { title: feature.title, page: cursor };
      cursor += 1;
      return entry;
    });
    return { category: group.category, items };
  });

  return (
    <Document
      title="Nubuat — Feature Guide"
      author="Nubuat"
      subject="Penjelasan fitur Nubuat dengan screenshot tiap halaman"
      creator="Nubuat Pitchdeck PDF Generator"
    >
      {/* Cover */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.coverEyebrow}>Pitchdeck · Feature Guide</Text>
          <Text style={styles.coverTitle}>Nubuat</Text>
          <View style={styles.coverDivider} />
          <Text style={styles.coverSubtitle}>
            Terminal analisis saham Indonesia berbasis AI. Penjelasan {total}{" "}
            fitur unggulan, lengkap dengan screenshot tiap halaman.
          </Text>
          <Text style={styles.coverMeta}>
            Generated: {dateStr}
            {"\n"}
            Confidential · Internal Distribution
          </Text>
        </View>
        <Footer pageLabel="Cover" />
      </Page>

      {/* Table of Contents */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.tocTitle}>Daftar Isi</Text>
        {tocEntries.map((group) => (
          <View key={group.category}>
            <Text style={styles.tocSectionTitle}>{group.category}</Text>
            {group.items.map((entry) => (
              <View key={entry.title} style={styles.tocRow}>
                <Text style={styles.tocText}>{entry.title}</Text>
                <Text style={styles.tocPage}>{entry.page}</Text>
              </View>
            ))}
          </View>
        ))}
        <Footer pageLabel="ii" />
      </Page>

      {/* Feature pages */}
      {grouped.flatMap((group) =>
        group.items.map((feature, idx) => {
          const img = screenshots[feature.slug];
          const tier = feature.tier ?? "open";
          return (
            <Page key={feature.slug} size="A4" style={styles.page}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryBadge}>{group.category}</Text>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featurePath}>{feature.path}</Text>
                </View>
                <Text
                  style={{
                    ...styles.tierBadge,
                    backgroundColor: TIER_COLOR[tier],
                  }}
                >
                  {tier === "open" ? "ALL TIERS" : tier.toUpperCase()}
                </Text>
              </View>

              <View style={styles.screenshotBox}>
                {img ? (
                  <Image src={img} style={styles.screenshot} />
                ) : (
                  <Text style={styles.screenshotMissing}>
                    Screenshot belum tersedia — run{" "}
                    `npm exec tsx -- scripts/capture-pitchdeck-screenshots.ts`
                  </Text>
                )}
              </View>

              <Text style={styles.pitch}>{feature.pitch}</Text>

              <Text style={styles.highlightsHeader}>Key Highlights</Text>
              {feature.highlights.map((h, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bullet}>▸</Text>
                  <Text style={styles.bulletText}>{h}</Text>
                </View>
              ))}

              <Footer pageLabel={`${idx + 1} / ${group.items.length}`} />
            </Page>
          );
        }),
      )}
    </Document>
  );
}
