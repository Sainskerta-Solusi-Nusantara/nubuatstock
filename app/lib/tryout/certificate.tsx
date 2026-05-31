import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/**
 * Certificate of Completion — Try Out WMI. Dirender ke PDF via @react-pdf/renderer
 * (lihat app/api/tryout/certificate/[attemptId]/route.tsx).
 *
 * Catatan: ini sertifikat penyelesaian LATIHAN internal Nubuat, BUKAN sertifikasi
 * resmi WMI dari lembaga sertifikasi. Disebutkan eksplisit di footer.
 */

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#0a0a0a",
    color: "#fafafa",
    padding: 48,
    fontFamily: "Helvetica",
  },
  border: {
    flex: 1,
    border: "2 solid #16a34a",
    borderRadius: 8,
    padding: 36,
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#16a34a" },
  badge: { fontSize: 9, color: "#a3a3a3" },
  center: { alignItems: "center", marginTop: 24 },
  title: { fontSize: 26, fontFamily: "Helvetica-Bold", marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 11, color: "#a3a3a3", marginBottom: 28, textAlign: "center" },
  given: { fontSize: 10, color: "#a3a3a3", marginBottom: 6 },
  name: { fontSize: 30, fontFamily: "Helvetica-Bold", color: "#fafafa", marginBottom: 8, textAlign: "center" },
  underline: { width: 320, borderBottom: "1 solid #404040", marginBottom: 20 },
  desc: { fontSize: 11, color: "#d4d4d4", textAlign: "center", lineHeight: 1.5, maxWidth: 460 },
  scoreRow: { flexDirection: "row", justifyContent: "center", marginTop: 22, gap: 40 },
  scoreBox: { alignItems: "center" },
  scoreVal: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#16a34a" },
  scoreLbl: { fontSize: 8, color: "#a3a3a3", marginTop: 2, textTransform: "uppercase" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 24 },
  footerCol: { maxWidth: 240 },
  footerLabel: { fontSize: 8, color: "#737373" },
  footerVal: { fontSize: 9, color: "#d4d4d4" },
  disclaimer: { fontSize: 7, color: "#737373", marginTop: 14, textAlign: "center", lineHeight: 1.4 },
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
        <View style={styles.border}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>👍 {data.appName} Academy</Text>
            <Text style={styles.badge}>Certificate of Completion</Text>
          </View>

          <View style={styles.center}>
            <Text style={styles.title}>Sertifikat Penyelesaian</Text>
            <Text style={styles.subtitle}>Try Out Persiapan WMI — Wakil Manajer Investasi</Text>

            <Text style={styles.given}>Diberikan kepada</Text>
            <Text style={styles.name}>{data.name}</Text>
            <View style={styles.underline} />

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
                  {data.correct}/{data.total}
                </Text>
                <Text style={styles.scoreLbl}>Jawaban Benar</Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={styles.scoreVal}>LULUS</Text>
                <Text style={styles.scoreLbl}>Status</Text>
              </View>
            </View>
          </View>

          <View>
            <View style={styles.footer}>
              <View style={styles.footerCol}>
                <Text style={styles.footerLabel}>Tanggal</Text>
                <Text style={styles.footerVal}>{data.dateLabel}</Text>
              </View>
              <View style={[styles.footerCol, { alignItems: "flex-end" }]}>
                <Text style={styles.footerLabel}>ID Sertifikat</Text>
                <Text style={styles.footerVal}>{data.certificateId}</Text>
              </View>
            </View>
            <Text style={styles.disclaimer}>
              Sertifikat ini adalah tanda penyelesaian LATIHAN/simulasi di {data.appName} Academy dan
              BUKAN sertifikasi resmi WMI dari lembaga sertifikasi profesi. Soal latihan disusun
              berdasarkan silabus WMI untuk tujuan edukasi.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
