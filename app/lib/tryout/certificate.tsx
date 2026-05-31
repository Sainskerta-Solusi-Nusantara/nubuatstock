import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/**
 * Certificate of Completion — Try Out WMI. Dirender ke PDF via @react-pdf/renderer
 * (lihat app/api/tryout/certificate/[attemptId]/route.tsx).
 *
 * Desain: tema PUTIH + HIJAU. Tanpa emoji (Helvetica react-pdf tak bisa render
 * emoji → bikin teks numpuk). Spacing eksplisit antar-blok supaya tidak overlap.
 *
 * Catatan: ini sertifikat penyelesaian LATIHAN internal Nubuat, BUKAN sertifikasi
 * resmi WMI dari lembaga sertifikasi. Disebutkan eksplisit di footer.
 */

const GREEN = "#16a34a";
const GREEN_DARK = "#15803d";
const INK = "#1a2e22";
const MUTED = "#6b7280";

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: INK,
    padding: 28,
    fontFamily: "Helvetica",
  },
  // Bingkai ganda hijau di atas latar putih.
  outer: {
    flex: 1,
    border: `3 solid ${GREEN}`,
    borderRadius: 10,
    padding: 6,
  },
  inner: {
    flex: 1,
    border: `1 solid ${GREEN}`,
    borderRadius: 6,
    paddingVertical: 36,
    paddingHorizontal: 44,
    justifyContent: "space-between",
  },
  // Header
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GREEN_DARK },
  badge: {
    fontSize: 8,
    color: GREEN_DARK,
    border: `1 solid ${GREEN}`,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  // Body tengah
  center: { alignItems: "center" },
  title: { fontSize: 28, fontFamily: "Helvetica-Bold", color: INK, marginBottom: 6 },
  titleRule: { width: 64, height: 3, backgroundColor: GREEN, borderRadius: 2, marginBottom: 14 },
  subtitle: { fontSize: 11, color: MUTED, marginBottom: 26 },
  given: { fontSize: 10, color: MUTED, marginBottom: 10 },
  name: { fontSize: 30, fontFamily: "Helvetica-Bold", color: GREEN_DARK, marginBottom: 12 },
  nameRule: { width: 300, height: 1, backgroundColor: "#d1d5db", marginBottom: 22 },
  desc: { fontSize: 11, color: "#374151", textAlign: "center", lineHeight: 1.6, maxWidth: 470 },
  // Skor
  scoreRow: { flexDirection: "row", justifyContent: "center", marginTop: 26 },
  scoreBox: {
    alignItems: "center",
    marginHorizontal: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#f0fdf4",
    border: `1 solid #bbf7d0`,
    borderRadius: 6,
  },
  scoreVal: { fontSize: 20, fontFamily: "Helvetica-Bold", color: GREEN_DARK },
  scoreLbl: { fontSize: 7, color: MUTED, marginTop: 3, textTransform: "uppercase", letterSpacing: 1 },
  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
  },
  footerCol: { maxWidth: 240 },
  footerColRight: { maxWidth: 240, alignItems: "flex-end" },
  footerLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 1 },
  footerVal: { fontSize: 10, color: INK, marginTop: 2 },
  disclaimer: {
    fontSize: 7,
    color: "#9ca3af",
    marginTop: 16,
    textAlign: "center",
    lineHeight: 1.5,
  },
});

export interface CertificateData {
  name: string;
  packageTitle: string;
  scorePct: number;
  correct: number;
  total: number;
  dateLabel: string; // sudah diformat Indonesia
  certificateId: string;
  appName: string;
}

export function TryoutCertificate(data: CertificateData) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.outer}>
          <View style={styles.inner}>
            {/* Header */}
            <View style={styles.brandRow}>
              <Text style={styles.brand}>{data.appName} Academy</Text>
              <Text style={styles.badge}>CERTIFICATE OF COMPLETION</Text>
            </View>

            {/* Tengah */}
            <View style={styles.center}>
              <Text style={styles.title}>Sertifikat Penyelesaian</Text>
              <View style={styles.titleRule} />
              <Text style={styles.subtitle}>
                Try Out Persiapan WMI — Wakil Manajer Investasi
              </Text>

              <Text style={styles.given}>Diberikan kepada</Text>
              <Text style={styles.name}>{data.name}</Text>
              <View style={styles.nameRule} />

              <Text style={styles.desc}>
                Telah berhasil menyelesaikan dan LULUS {data.packageTitle} pada program
                latihan persiapan ujian WMI di {data.appName} Academy.
              </Text>

              <View style={styles.scoreRow}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreVal}>{data.scorePct}%</Text>
                  <Text style={styles.scoreLbl}>Skor Akhir</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreVal}>
                    {data.correct} / {data.total}
                  </Text>
                  <Text style={styles.scoreLbl}>Jawaban Benar</Text>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreVal}>LULUS</Text>
                  <Text style={styles.scoreLbl}>Status</Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View>
              <View style={styles.footer}>
                <View style={styles.footerCol}>
                  <Text style={styles.footerLabel}>Tanggal</Text>
                  <Text style={styles.footerVal}>{data.dateLabel}</Text>
                </View>
                <View style={styles.footerColRight}>
                  <Text style={styles.footerLabel}>ID Sertifikat</Text>
                  <Text style={styles.footerVal}>{data.certificateId}</Text>
                </View>
              </View>
              <Text style={styles.disclaimer}>
                Sertifikat ini adalah tanda penyelesaian LATIHAN/simulasi di {data.appName}{" "}
                Academy dan BUKAN sertifikasi resmi WMI dari lembaga sertifikasi profesi. Soal
                latihan disusun berdasarkan silabus WMI untuk tujuan edukasi.
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
