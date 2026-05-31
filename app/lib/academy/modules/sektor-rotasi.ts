// Modul Analisis Sektor & Rotasi — Academy Nubuat.
// Materi konsep + praktik (lihat lib/academy/content.ts).
import type { AcademyModule } from "../content";

export const sektorRotasiModule: AcademyModule = {
  slug: "analisis-sektor-rotasi",
  title: "Analisis Sektor & Rotasi",
  icon: "Radar",
  level: "Menengah",
  description:
    "Baca siklus & rotasi sektor IDX: kapan sektor memimpin/tertinggal, cara pakai RRG dan Sector Heatmap untuk timing.",
  lessons: [
    {
      slug: "sr-kenapa-sektor-penting",
      title: "Kenapa Sektor Menentukan Sebagian Besar Return",
      readMinutes: 6,
      summary: "Riset klasik: pemilihan sektor sering lebih menentukan ketimbang pilih saham individual.",
      body: `## Kenapa harus peduli sektor?

Banyak pemula langsung loncat ke "saham apa yang bagus?" — padahal pertanyaan pertama yang lebih penting adalah **"sektor apa yang sedang dilirik uang?"**

Alasannya sederhana: dalam satu sektor, saham cenderung bergerak **beriringan**. Kalau sektor perbankan lagi disukai, BBRI/BBCA/BMRI biasanya naik bareng. Kalau sektor properti ditinggalkan, jago apa pun kamu pilih emiten properti, lawannya berat.

> **Prinsip:** Pilih sektor yang benar dulu → peluang menangmu naik bahkan sebelum memilih emiten.

## Tiga lapis keputusan

1. **Pasar (IHSG)** — sedang uptrend, sideways, atau downtrend?
2. **Sektor** — sektor mana yang *outperform* IHSG?
3. **Emiten** — di sektor pemenang, mana yang paling kuat (leader)?

Urutan ini disebut **top-down analysis**. Kebalikannya (bottom-up) langsung ke emiten — boleh, tapi rawan "benar emiten, salah sektor".

## 11 sektor IDX (IDX-IC)

Bursa mengelompokkan emiten ke 11 sektor, antara lain: **Keuangan, Energi, Barang Baku, Industri, Konsumen Primer, Konsumen Non-Primer, Kesehatan, Infrastruktur, Properti & Real Estat, Teknologi, Transportasi & Logistik.**

Tiap sektor punya **karakter** berbeda:
- **Defensif** (Konsumen Primer, Kesehatan) → relatif tahan saat ekonomi lesu.
- **Siklikal** (Energi, Barang Baku, Properti) → ikut naik-turun siklus ekonomi & komoditas.
- **Sensitif suku bunga** (Properti, Keuangan) → bereaksi kuat ke kebijakan BI.

Kenali karakter ini supaya kamu tahu *kapan* tiap sektor "musimnya".`,
    },
    {
      slug: "sr-siklus-ekonomi-sektor",
      title: "Siklus Ekonomi & Giliran Sektor",
      readMinutes: 7,
      summary: "Tiap fase siklus ekonomi punya sektor 'juara'-nya. Kenali polanya.",
      body: `## Sektor bergiliran mengikuti siklus

Ekonomi bergerak dalam siklus: **ekspansi → puncak → kontraksi → pemulihan**. Uang institusi cenderung berpindah antar sektor mengikuti fase ini (sector rotation).

### Pola umum (sederhana)

| Fase ekonomi | Sektor cenderung memimpin |
|---|---|
| Pemulihan awal (suku bunga turun) | Properti, Keuangan, Konsumen Non-Primer |
| Ekspansi (pertumbuhan kuat) | Industri, Teknologi, Barang Baku |
| Puncak (inflasi tinggi) | Energi, Barang Baku (komoditas) |
| Kontraksi (perlambatan) | Konsumen Primer, Kesehatan, Infrastruktur (defensif) |

> Ini **pola**, bukan hukum pasti. IDX punya bumbu lokal: harga komoditas (batu bara, CPO, nikel), kurs, dan kebijakan pemerintah sering menggeser urutan.

## Sinyal pergeseran

- **Suku bunga BI** mulai turun → cek Properti & Keuangan.
- **Harga komoditas** melonjak → cek Energi & Barang Baku.
- **Daya beli melemah / resesi takut** → uang lari ke defensif (Konsumen Primer, Kesehatan).

## Cara praktis di Nubuat

Buka **Sector Heatmap** — lihat sektor mana hijau (kuat) vs merah (lemah) dalam berbagai timeframe. Sektor yang konsisten hijau di 1 bulan + 3 bulan = ada aliran dana masuk. Itu kandidat tempat berburu emiten.`,
    },
    {
      slug: "sr-rrg-relative-rotation",
      title: "Membaca RRG (Relative Rotation Graph)",
      readMinutes: 8,
      summary: "4 kuadran RRG: Leading, Weakening, Lagging, Improving — dan arah putarannya.",
      body: `## Apa itu RRG?

**Relative Rotation Graph (RRG)** memetakan kekuatan sektor *relatif terhadap benchmark* (IHSG) dalam 2 sumbu:

- **Sumbu X — RS-Ratio:** seberapa kuat sektor dibanding IHSG (kanan = lebih kuat).
- **Sumbu Y — RS-Momentum:** arah perubahan kekuatan itu (atas = momentum membaik).

Hasilnya 4 kuadran:

| Kuadran | Arti | Sikap |
|---|---|---|
| **Leading** (kanan-atas) | Kuat & momentum positif | Pegang / cari leader |
| **Weakening** (kanan-bawah) | Masih kuat tapi momentum melemah | Waspada, siap kurangi |
| **Lagging** (kiri-bawah) | Lemah & momentum negatif | Hindari |
| **Improving** (kiri-atas) | Masih lemah tapi mulai membaik | Watchlist, calon naik |

## Putaran searah jarum jam

Sektor biasanya bergerak **searah jarum jam**:

\`\`\`
Improving → Leading → Weakening → Lagging → Improving ...
\`\`\`

Artinya: sektor di **Improving** yang bergerak menuju **Leading** adalah kandidat menarik (momentum baru tumbuh), sementara yang di **Leading** menuju **Weakening** mulai kehilangan tenaga.

> **Ekor (tail)** pada RRG menunjukkan jejak beberapa periode terakhir — perhatikan **arah** ekornya, bukan cuma posisi titiknya.

## Pakai di Nubuat

Buka menu **Rotation (RRG)**. Cari sektor yang:
1. Ada di **Improving** dengan ekor mengarah ke kanan-atas (menuju Leading), atau
2. Mantap di **Leading** dengan ekor masih naik.

Lalu turun ke emiten leader di sektor itu (lihat lesson berikutnya).`,
    },
    {
      slug: "sr-dari-sektor-ke-emiten",
      title: "Dari Sektor ke Emiten: Pilih Leader",
      readMinutes: 6,
      summary: "Setelah ketemu sektor kuat, pilih emiten leader — bukan yang paling ketinggalan.",
      body: `## Jangan beli yang "paling murah ketinggalan"

Kesalahan umum: setelah tahu sektor kuat, malah beli emiten yang **belum naik** dengan alasan "masih murah / belum lari". Padahal di sektor yang kuat, **leader** (yang memimpin kenaikan) justru biasanya paling kuat dan paling likuid.

> Kekuatan relatif itu *persistent* — yang kuat cenderung lanjut kuat dalam jangka menengah.

## Ciri leader sektor

1. **Relative strength tinggi** — naik lebih dulu & lebih kencang dari rekan sektornya.
2. **Likuiditas besar** — value transaksi tebal (gampang masuk-keluar).
3. **Struktur teknikal sehat** — higher high / higher low, di atas MA penting.
4. **Didukung fundamental** — bukan sekadar "digoreng".

## Alur lengkap (top-down)

1. **IHSG** uptrend? (kalau downtrend kuat, kecilkan eksposur).
2. **Sector Heatmap / RRG** → pilih 1-2 sektor Leading/Improving.
3. Di sektor itu, **bandingkan emiten** (pakai fitur *Compare*) → cari leader.
4. Cek **Nubuat Verdict** emiten tersebut + level entry teknikal.
5. Tentukan **risk** (stop loss & position sizing) sebelum masuk.

## Latihan

Buka RRG → catat 2 sektor di kuadran Improving/Leading. Untuk tiap sektor, buka Heatmap/Compare → tulis 1 emiten leader-nya. Cek Verdict-nya. Ulangi tiap pekan supaya peka pada rotasi.

> Ingat: ini edukasi, bukan ajakan beli/jual. Selalu kelola risiko sendiri.`,
    },
  ],
};
