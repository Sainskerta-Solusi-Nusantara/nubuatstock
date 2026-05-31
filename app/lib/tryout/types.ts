/**
 * Tipe untuk fitur Try Out WMI (Wakil Manajer Investasi).
 *
 * PENTING (kejujuran): Soal di sini adalah SOAL LATIHAN yang disusun berdasarkan
 * SILABUS & KISI-KISI resmi WMI — BUKAN reproduksi soal ujian asli (yang berhak
 * cipta & tidak dipublikasikan). Tujuannya melatih topik, format, dan tingkat
 * kesulitan ujian, secara legal & etis.
 *
 * Bank soal = konten statik typed (seperti Academy). Riwayat pengerjaan
 * (attempt + jawaban + skor) disimpan di DB (db/schema/tryout.ts).
 */

/** Domain silabus WMI — dipakai untuk tagging & ringkasan per-topik. */
export type WmiDomain =
  | "ekonomi_keuangan"
  | "produk_investasi"
  | "reksa_dana"
  | "manajemen_portofolio"
  | "analisis_efek"
  | "etika_regulasi";

export const WMI_DOMAIN_LABEL: Record<WmiDomain, string> = {
  ekonomi_keuangan: "Ekonomi & Keuangan",
  produk_investasi: "Produk Investasi & Pasar Modal",
  reksa_dana: "Reksa Dana & Pengelolaan Investasi",
  manajemen_portofolio: "Manajemen Portofolio",
  analisis_efek: "Analisis Efek (Saham & Obligasi)",
  etika_regulasi: "Etika & Regulasi Pasar Modal",
};

export interface TryoutQuestion {
  /** Stabil & unik dalam satu paket (mis. "p01-q03"). */
  id: string;
  domain: WmiDomain;
  question: string;
  /** Selalu 4 opsi (A-D). */
  options: [string, string, string, string];
  /** Index jawaban benar 0-3. */
  correctIndex: 0 | 1 | 2 | 3;
  /** Pembahasan — ditampilkan setelah try out selesai. */
  explanation: string;
}

export interface TryoutPackage {
  /** Slug stabil, mis. "wmi-paket-01". */
  slug: string;
  /** Nomor paket 1-10. */
  number: number;
  title: string;
  description: string;
  /** Durasi disarankan (menit). */
  durationMinutes: number;
  questions: TryoutQuestion[];
}

/** Ambang lulus (persentase benar). */
export const TRYOUT_PASS_THRESHOLD = 70;
