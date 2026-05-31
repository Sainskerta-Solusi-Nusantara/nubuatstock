// Modul Insider Trading & Integritas Pasar — Academy Nubuat.
import type { AcademyModule } from "../content";

export const insiderIntegritasModule: AcademyModule = {
  slug: "insider-trading-integritas",
  title: "Insider Trading & Integritas Pasar",
  icon: "Scale",
  level: "Menengah",
  description:
    "Sudut edukatif & defensif: apa itu insider trading, kenapa ILEGAL, sanksinya, serta cara mengenali gejala & melindungi diri sebagai investor ritel.",
  lessons: [
    {
      slug: "in-apa-itu",
      title: "Apa Itu Insider Trading & Kenapa Ilegal",
      readMinutes: 6,
      summary: "Memperdagangkan info material yang belum publik — merusak keadilan pasar.",
      body: `## Definisi

**Insider trading** (perdagangan orang dalam) = bertransaksi saham berdasarkan **informasi material yang belum tersedia untuk publik**, yang didapat karena posisi/akses istimewa.

Contoh **informasi material**: rencana akuisisi, laporan laba yang belum dirilis, right issue, kontrak besar, kepailitan — hal yang bisa **menggerakkan harga signifikan** saat diumumkan.

**Orang dalam (insider)** bisa: direksi/komisaris, karyawan, konsultan, auditor, atau siapa pun yang menerima bocoran dari mereka (tippee).

## Kenapa ILEGAL & dilarang keras

1. **Tidak adil** — insider untung di atas kerugian investor publik yang tidak punya akses info sama.
2. **Merusak kepercayaan** — kalau pasar dianggap "main curang", investor kabur, likuiditas mati.
3. **Melanggar hukum** — di Indonesia diatur **UU Pasar Modal** (UU No. 8/1995 & perubahannya via UU P2SK). OJK mengawasi & menindak.

> Ini **kejahatan pasar modal**, bukan "strategi pintar". Materi ini mengajarkan kamu **mengenali & menghindari**, bukan melakukannya.

## Sanksi

Pelanggaran bisa kena **sanksi administratif (denda besar oleh OJK), pengembalian keuntungan, sampai pidana** (penjara & denda) sesuai UU. Termasuk yang **menyebarkan bocoran** maupun yang **memanfaatkannya**.

## Beda dengan analisis legal

- **Legal:** menganalisis info **publik** (laporan keuangan, berita, data transaksi) — ini yang Academy ajarkan.
- **Ilegal:** transaksi berdasar info **rahasia non-publik** dari orang dalam.

Bandarmologi & analisis transaksi (modul lain) membaca **jejak publik** di pasar — itu sah. Yang dilarang adalah punya & memakai info dapur yang belum diumumkan.`,
    },
    {
      slug: "in-kenali-lindungi",
      title: "Mengenali Gejala & Melindungi Diri",
      readMinutes: 6,
      summary: "Tanda aktivitas tak wajar + sikap investor ritel yang benar.",
      body: `## Gejala yang sering muncul

Kadang ada **aktivitas tak wajar SEBELUM** berita resmi keluar — pola yang mungkin (bukan pasti) terkait kebocoran info:

1. **Harga/volume melonjak tiba-tiba** tanpa berita publik, lalu **beberapa hari kemudian** muncul pengumuman besar (akuisisi, laba lompat, dll).
2. **UMA (Unusual Market Activity)** dari bursa — peringatan resmi aktivitas tak wajar.
3. **Broker tertentu** akumulasi agresif menjelang corporate action.

> Penting: lonjakan sebelum berita **belum tentu** insider trading — bisa kebetulan, rumor, atau analisis jeli. Tapi pola berulang yang mencurigakan adalah alasan bursa menerbitkan UMA & OJK menyelidiki.

## Sikap investor ritel yang benar

1. **Jangan kejar saham yang sudah melonjak liar** dengan harapan "ada berita bagus". Kamu sering jadi yang terakhir masuk (exit liquidity).
2. **Hati-hati "bisikan orang dalam"** di grup/DM: "ada berita besar, masuk sekarang!"
   - Kalau **benar info orang dalam** → kamu ikut **melanggar hukum** (tippee juga kena).
   - Kalau **bohong** (lebih sering) → kamu dijebak pump-and-dump.
   - **Dua-duanya merugikan kamu.** Abaikan.
3. **Andalkan info publik & analisis** — itu legal, berkelanjutan, dan bisa dipertanggungjawabkan.
4. **Laporkan** kalau melihat indikasi manipulasi/insider ke OJK — kamu ikut menjaga pasar.

## Kalau kamu kebetulan "orang dalam"

Kalau kamu karyawan/relasi emiten dan tahu info material yang belum publik: **jangan transaksi** saham itu sampai info diumumkan resmi, dan **jangan bocorkan**. Patuhi aturan blackout period perusahaan.

## Inti

> Pasar yang adil melindungi kamu juga. Main bersih bukan cuma soal hukum — strategi berbasis info publik & manajemen risiko adalah satu-satunya yang **berkelanjutan**. Jalan pintas via bocoran = risiko pidana + sering jadi korban penipuan.

Edukasi, bukan nasihat hukum. Untuk kasus spesifik, rujuk UU Pasar Modal & OJK.`,
    },
  ],
};
