// Modul Makro & Tema Pasar — Academy Nubuat.
import type { AcademyModule } from "../content";

export const makroTemaPasarModule: AcademyModule = {
  slug: "makro-tema-pasar",
  title: "Makro & Tema Pasar",
  icon: "Globe",
  level: "Menengah",
  description:
    "Baca gambaran besar: suku bunga BI, inflasi, kurs, harga komoditas, dan aliran dana asing — supaya paham 'cuaca' pasar sebelum memilih saham.",
  lessons: [
    {
      slug: "mk-kenapa-makro",
      title: "Kenapa Makro Penting buat Investor Saham",
      readMinutes: 6,
      summary: "Makro adalah 'cuaca' pasar — menentukan arah angin sebelum kamu memilih kapal.",
      body: `## Makro = cuaca, saham = kapal

Saham terbaik pun berat melawan arus makro yang buruk. **Makroekonomi** menentukan "cuaca" pasar: likuiditas, selera risiko, dan ke mana uang mengalir.

Kamu tidak perlu jadi ekonom. Cukup paham **beberapa variabel kunci** dan **arah** pengaruhnya ke saham.

## Lima variabel kunci untuk IDX

1. **Suku bunga BI (BI-Rate)** — biaya uang.
2. **Inflasi** — daya beli & arah suku bunga.
3. **Kurs USD/IDR** — rupiah kuat/lemah.
4. **Harga komoditas** — batu bara, CPO, nikel, minyak (IDX banyak emiten komoditas).
5. **Aliran dana asing (foreign flow)** — net buy/sell investor asing.

## Logika dasar

- **Suku bunga turun** → uang murah → bagus untuk saham (terutama Properti, Keuangan, Konsumen).
- **Suku bunga naik** → uang mahal → menekan valuasi, terutama saham growth/teknologi.
- **Rupiah melemah** → bagus untuk eksportir (komoditas, CPO), buruk untuk importir & emiten berutang USD.

> Tujuan modul ini: kamu bisa baca **judul berita ekonomi** lalu menebak **sektor mana** yang diuntungkan/dirugikan. Itu sudah sangat membantu timing & pemilihan sektor.`,
    },
    {
      slug: "mk-suku-bunga-inflasi",
      title: "Suku Bunga & Inflasi",
      readMinutes: 7,
      summary: "Dua tuas terpenting bank sentral — dan dampaknya ke valuasi saham per sektor.",
      body: `## Suku bunga: biaya uang

Bank sentral (BI, dan acuan global The Fed) mengatur suku bunga untuk menjaga inflasi & stabilitas.

### Saat suku bunga TURUN
- Pinjaman & KPR lebih murah → **Properti, Otomotif, Konsumen** terbantu.
- Bank lebih mudah salurkan kredit → **Keuangan** (umumnya positif).
- Obligasi kurang menarik → uang pindah ke saham (risk-on).
- Valuasi saham **growth/teknologi** naik (arus kas masa depan didiskon lebih rendah).

### Saat suku bunga NAIK
- Biaya dana mahal → menekan emiten berutang besar.
- Valuasi growth tertekan; investor lebih pilih saham **nilai & dividen**.
- Deposito/obligasi jadi menarik → sebagian uang keluar dari saham.

## Inflasi

**Inflasi** = kenaikan harga umum.
- Inflasi **terkendali** → sehat, tanda ekonomi tumbuh.
- Inflasi **tinggi** → BI cenderung **naikkan** suku bunga (rem) → tekanan ke pasar.
- Inflasi **terlalu rendah/deflasi** → permintaan lemah, juga tidak sehat.

> Hubungan rantai: **Inflasi tinggi → suku bunga naik → valuasi tertekan.** Itu sebabnya rilis data inflasi & rapat BI/The Fed digerakkan pasar.

## Yang dipantau

- Pengumuman **BI-Rate** (Rapat Dewan Gubernur bulanan).
- Rilis **inflasi (CPI)** bulanan dari BPS.
- Arah **The Fed** (FOMC) — memengaruhi arus modal global ke emerging market termasuk IDX.`,
    },
    {
      slug: "mk-kurs-komoditas",
      title: "Kurs Rupiah & Harga Komoditas",
      readMinutes: 7,
      summary: "Siapa untung saat rupiah melemah, dan kenapa harga batu bara/CPO/nikel menggerakkan IHSG.",
      body: `## Kurs USD/IDR

Rupiah **melemah** (USD naik) vs **menguat** punya pemenang & pecundang berbeda.

### Rupiah MELEMAH (USD/IDR naik)
- **Untung:** eksportir — komoditas (batu bara, CPO, nikel) terima USD, biaya rupiah → margin melebar.
- **Rugi:** importir & emiten dengan **utang USD** (beban bunga & pokok membengkak dalam rupiah), mis. sebagian emiten yang bahan bakunya impor.

### Rupiah MENGUAT
- Kebalikannya: importir & emiten berutang USD terbantu; eksportir margin menyempit.

> Cek **struktur pendapatan & utang** emiten: pendapatan USD? utang USD? Itu menentukan dia diuntungkan atau dirugikan oleh pergerakan kurs.

## Harga komoditas & IDX

IHSG punya bobot besar di emiten **komoditas**. Maka harga global sangat berpengaruh:
- **Batu bara naik** → ADRO, PTBA, ITMG, dll cenderung terangkat.
- **CPO (minyak sawit) naik** → emiten perkebunan (AALI, LSIP, dll).
- **Nikel naik** → emiten nikel/tambang logam.
- **Minyak dunia** → memengaruhi energi & biaya banyak sektor.

## Kaitannya

Saat **siklus komoditas** sedang naik (commodity supercycle), sektor Energi & Barang Baku sering memimpin IHSG. Saat harga komoditas jatuh, giliran sektor lain. Ini bahan bagus dipadukan dengan **analisis rotasi sektor** (lihat modul *Analisis Sektor & Rotasi*).

## Praktis

Pantau harga acuan (batu bara Newcastle, CPO Malaysia, nikel LME, Brent) lewat sumber berita ekonomi. Kalau tren komoditas jelas, sektornya jadi tempat berburu.`,
    },
    {
      slug: "mk-foreign-flow-tema",
      title: "Aliran Dana Asing & Berpikir Tematik",
      readMinutes: 6,
      summary: "Baca foreign flow & rangkai 'tema' makro jadi keputusan sektor — tanpa overthinking.",
      body: `## Aliran dana asing (foreign flow)

Investor asing punya porsi besar di saham-saham likuid IDX (big caps). Arah **net buy / net sell** asing sering memengaruhi IHSG, terutama emiten LQ45.

- **Foreign net buy** konsisten → sentimen risk-on, big caps terangkat.
- **Foreign net sell** deras → tekanan, sering saat ada gejolak global (mis. The Fed hawkish, geopolitik).

> Foreign flow bukan ramalan pasti — tapi tren beberapa minggu memberi gambaran "selera" pemain besar terhadap pasar kita.

## Berpikir tematik

"**Tema**" = narasi besar yang menggerakkan sekelompok saham, mis.:
- **Hilirisasi nikel** → tambang & smelter logam.
- **Transisi energi / EV** → nikel, baterai, utilitas.
- **Pemulihan daya beli / lebaran** → konsumer & ritel.
- **Penurunan suku bunga** → properti & bank.

Cara pakai: dari **kondisi makro** (suku bunga, kurs, komoditas, kebijakan pemerintah) → rumuskan **tema** → cari **sektor** yang diuntungkan → pilih **emiten leader** (top-down).

## Jangan overthinking

Makro itu alat **konteks**, bukan ramalan harian. Kesalahan umum:
- **Lumpuh analisis** — nunggu semua data sempurna, tak pernah eksekusi.
- **Trading tiap rilis berita** — reaksi pasar sering sudah "priced in".

> **Sikap sehat:** Pakai makro untuk menentukan *arah angin & sektor*, lalu serahkan timing detail ke analisis teknikal + manajemen risiko. Gabungkan, jangan saling meniadakan.

## Rangkuman alur

\`\`\`
Makro (suku bunga, kurs, komoditas, flow)
   → Tema besar
      → Sektor diuntungkan (cek RRG/Heatmap)
         → Emiten leader (cek Verdict + teknikal)
            → Kelola risiko → eksekusi
\`\`\`

Ini edukasi, bukan ajakan jual/beli. Selalu kelola risiko sendiri.`,
    },
  ],
};
