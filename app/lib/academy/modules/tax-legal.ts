// Modul Pajak & Legal Investor — Academy Nubuat.
import type { AcademyModule } from "../content";

export const taxLegalModule: AcademyModule = {
  slug: "pajak-legal-investor",
  title: "Pajak & Legal Investor",
  icon: "Landmark",
  level: "Pemula",
  description:
    "Sisi pajak & legal investor ritel IDX: pajak transaksi & dividen, lapor SPT saham, serta perlindungan hukum (KSEI, AKSes). Edukasi, bukan nasihat pajak.",
  lessons: [
    {
      slug: "tx-pajak-transaksi-capgain",
      title: "Pajak Transaksi & Capital Gain",
      readMinutes: 6,
      summary: "Bagaimana pajak saham bekerja di Indonesia — sudah otomatis dipotong.",
      body: `## Kabar baik: sebagian besar sudah otomatis

Di Indonesia, pajak transaksi saham relatif sederhana untuk ritel karena **dipotong otomatis** oleh sistem bursa/sekuritas — kamu tidak perlu hitung manual tiap transaksi.

## PPh final atas penjualan saham

Setiap **penjualan** saham di bursa kena **PPh final 0,1% dari nilai transaksi jual** (bruto), langsung dipotong sekuritas. Ini berlaku baik untung maupun rugi (karena final atas nilai jual, bukan atas keuntungan).

> Itu sebabnya **fee jual lebih besar dari fee beli** — ada tambahan PPh final 0,1% di sisi jual.

## Tidak ada pajak capital gain terpisah

Karena penjualan sudah kena PPh final 0,1%, **keuntungan (capital gain) tidak dikenakan PPh progresif lagi**. Jadi tidak ada "pajak untung" tambahan yang harus kamu hitung sendiri atas selisih harga.

## Komponen biaya transaksi (rangkuman)

| Sisi | Komponen |
|---|---|
| Beli | fee broker + levy + (PPN atas jasa) |
| Jual | fee broker + levy + PPN + **PPh final 0,1%** |

Total ±0,15% beli & ±0,25% jual (beda tiap sekuritas). Selalu cek struktur fee sekuritasmu.

> Edukasi umum — aturan & tarif pajak bisa berubah. Untuk kepastian, rujuk **DJP (pajak.go.id)** atau konsultan pajak.`,
    },
    {
      slug: "tx-dividen-spt",
      title: "Pajak Dividen & Lapor SPT",
      readMinutes: 7,
      summary: "Dividen bisa bebas pajak kalau diinvestasikan kembali; tetap wajib lapor di SPT.",
      body: `![Ringkas pajak investor: PPh final 0,1% saat jual, dividen 0% jika reinvest atau 10% jika tidak, dan kewajiban lapor SPT](/academy/syariah/pajak-investor.svg)

## Pajak dividen (individu dalam negeri)

Sejak UU Cipta Kerja, **dividen yang diterima Wajib Pajak orang pribadi dalam negeri dapat DIKECUALIKAN dari PPh** dengan syarat **diinvestasikan kembali di Indonesia** dalam jangka waktu & instrumen tertentu sesuai ketentuan.

- **Diinvestasikan kembali** sesuai syarat → **bebas PPh** (0%).
- **Tidak** diinvestasikan kembali → kena **PPh final 10%**.

> Praktik: banyak investor yang memang reinvest (DRIP/beli saham lagi) menikmati dividen bebas pajak — tapi **ada kewajiban pelaporan & syarat** yang harus dipenuhi. Jangan asal klaim bebas; pahami ketentuannya.

## Wajib lapor SPT Tahunan

Meski pajak transaksi & dividen banyak yang final/otomatis, kamu **tetap WAJIB melaporkannya** di **SPT Tahunan**:

1. **Harta** — nilai portofolio saham per 31 Desember dilaporkan di bagian Harta.
2. **Penghasilan final** — dividen & keuntungan dilaporkan di bagian penghasilan yang dikenakan PPh final / dikecualikan.
3. Kalau dividen di-reinvest untuk bebas pajak → ada **laporan realisasi investasi** yang perlu disampaikan sesuai aturan.

> Lapor ≠ bayar lagi. Banyak yang sudah final/0%, tapi **tetap harus dicatat** di SPT. Tidak melapor = risiko masalah dengan DJP.

## Data untuk SPT

- **Summary tahunan dari sekuritas** (sering disediakan) — nilai portofolio, transaksi, dividen.
- **Bukti potong** dividen kalau ada.

## Praktik

- Simpan rekap transaksi & dividen sepanjang tahun.
- Jelang Maret (batas SPT OP), siapkan data dari sekuritas.
- Kalau ragu (apalagi nominal besar) → **konsultan pajak**.

> Edukasi umum, bukan nasihat pajak. Ketentuan (syarat reinvestasi, tarif, tenggat) bisa berubah — selalu cek aturan terbaru DJP.`,
    },
    {
      slug: "tx-legal-perlindungan",
      title: "Legal & Perlindungan Investor",
      readMinutes: 6,
      summary: "KSEI, AKSes, dana di RDN, dan cara memastikan asetmu aman.",
      body: `## Asetmu dicatat di KSEI, bukan 'numpang' di sekuritas

Saham yang kamu beli dicatat atas namamu di **KSEI (Kustodian Sentral Efek Indonesia)** lewat **Sub-Rekening Efek (SRE)**. Artinya, kalau sekuritasmu bermasalah, **kepemilikan sahammu tetap tercatat di KSEI** — bukan jadi milik sekuritas.

## AKSes KSEI — pantau sendiri

**AKSes (akses.ksei.co.id)** memungkinkan kamu **mengecek langsung** kepemilikan efek & saldo di KSEI, independen dari laporan sekuritas.

> **Wajib:** sesekali cek AKSes untuk memastikan saldo saham di KSEI cocok dengan laporan sekuritasmu. Ini perlindungan dari fraud/kesalahan.

## RDN — dana terpisah

Uangmu disimpan di **RDN (Rekening Dana Nasabah)** di **bank**, atas namamu, **terpisah** dari rekening operasional sekuritas. Sekuritas tidak bisa sembarangan memakai danamu.

## Memilih sekuritas yang aman

1. **Terdaftar & diawasi OJK** — cek izinnya. Jangan tergiur "robot trading" / skema di luar bursa resmi.
2. Anggota Bursa (AB) resmi IDX.
3. Reputasi & layanan jelas.

## Waspada penipuan

- **"Robot trading", "titip dana", janji return pasti"** → hampir selalu **ilegal/penipuan**. Investasi saham resmi **tidak menjanjikan untung pasti**.
- **Pump-and-dump grup** — diiming-imingi saham "pasti naik". Kamu jadi exit liquidity.
- **Akun/aplikasi palsu** mengatasnamakan sekuritas → selalu unduh dari sumber resmi.

> Prinsip: kalau ada yang menjanjikan **untung pasti & cepat**, itu lampu merah. Pasar saham nyata penuh ketidakpastian — itu wajar.

## Ringkas perlindungan

| Lapisan | Fungsi |
|---|---|
| KSEI | catat kepemilikan efek atas namamu |
| AKSes | kamu cek sendiri saldo di KSEI |
| RDN (bank) | dana terpisah atas namamu |
| OJK | mengawasi sekuritas & pasar |

> Edukasi, bukan nasihat hukum/pajak. Verifikasi izin pihak mana pun di OJK sebelum menyetor dana.`,
    },
  ],
};
