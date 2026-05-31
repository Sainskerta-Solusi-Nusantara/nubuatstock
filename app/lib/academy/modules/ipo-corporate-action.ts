// Modul IPO & Corporate Action — Academy Nubuat.
import type { AcademyModule } from "../content";

export const ipoCorporateActionModule: AcademyModule = {
  slug: "ipo-corporate-action",
  title: "IPO & Corporate Action",
  icon: "Rocket",
  level: "Menengah",
  description:
    "Pahami IPO, right issue, stock split, warrant, buyback, sampai RUPS — supaya tidak terjebak 'gorengan IPO' dan paham efek aksi korporasi ke sahammu.",
  lessons: [
    {
      slug: "ipo-cara-kerja",
      title: "IPO: Cara Kerja & Cara Membacanya",
      readMinutes: 8,
      summary: "Bagaimana perusahaan go public, baca prospektus, dan kenapa banyak IPO 'gorengan'.",
      body: `## Apa itu IPO?

**IPO (Initial Public Offering)** = pertama kalinya perusahaan menjual saham ke publik & tercatat di bursa. Tujuannya menggalang dana (ekspansi, bayar utang, atau exit pemegang lama).

## Alur ringkas

1. Perusahaan tunjuk **underwriter** (penjamin emisi).
2. Terbit **prospektus** — dokumen wajib berisi bisnis, keuangan, risiko, **penggunaan dana**.
3. **Book building** → tentukan harga penawaran (IPO price).
4. **Masa penawaran umum** → investor pesan (subscribe) lewat e-IPO/sekuritas.
5. **Penjatahan (allotment)** → kalau oversubscribed, jatah dipotong.
6. **Listing day** → saham mulai diperdagangkan.

## Baca prospektus — fokus ke 5 hal

1. **Bisnis** — model usaha jelas & dimengerti?
2. **Keuangan** — laba & arus kas sehat, atau rugi/utang besar?
3. **Penggunaan dana** — untuk ekspansi produktif, atau bayar utang/exit pemilik lama?
4. **Valuasi** — PER/PBV IPO vs emiten sejenis yang sudah listing. Kemahalan?
5. **Risiko** — bagian risiko di prospektus sering jujur; baca serius.

## Kenapa banyak "gorengan IPO"?

- **Float kecil** (saham beredar publik sedikit) → gampang digerakkan → ARA berhari-hari lalu ambruk.
- Hype tanpa fundamental → naik karena euforia, bukan kinerja.
- Pemilik lama **exit** (jual) lewat IPO.

> **Sikap sehat:** IPO bukan undian. Banyak IPO ARA di awal lalu jatuh jauh di bawah harga IPO. Kalau tidak paham bisnis & valuasinya, lebih baik lewati. Tidak ada FOMO yang sepadan dengan modal hangus.

## ARA/ARB di saham baru

Saham IPO punya batas **auto reject** khusus yang lebih lebar di hari-hari awal → volatilitas ekstrem. Hati-hati, ini pedang bermata dua.`,
    },
    {
      slug: "ipo-right-issue",
      title: "Right Issue (HMETD): Dilusi & Peluang",
      readMinutes: 7,
      summary: "Perusahaan terbit saham baru ke pemegang lama — efeknya dilusi, tapi kadang ada peluang.",
      body: `## Apa itu right issue?

**Right Issue / HMETD (Hak Memesan Efek Terlebih Dahulu)** = penerbitan **saham baru** yang ditawarkan dulu ke pemegang saham lama, biasanya dengan harga **diskon** dari harga pasar.

Tujuannya menggalang dana tambahan (ekspansi, bayar utang, perkuat modal — sering di perbankan).

## Dilusi

Karena jumlah saham bertambah, **kepemilikan & laba per saham (EPS) bisa terdilusi** kalau kamu tidak ikut menebus.

Contoh: rasio 2:1 artinya tiap 2 saham lama berhak menebus 1 saham baru pada harga pelaksanaan.

## Pilihanmu sebagai pemegang lama

1. **Tebus (exercise)** — bayar harga pelaksanaan, dapat saham baru, hindari dilusi.
2. **Jual rights-nya** — HMETD diperdagangkan sebentar di bursa (kode berakhiran -R). Kamu jual haknya, dapat sedikit kompensasi, tapi tetap terdilusi.
3. **Diam saja** — hak hangus + kena dilusi. **Pilihan terburuk** (rugi tanpa kompensasi).

> Kalau tidak mau ikut, **minimal jual rights-nya**, jangan dibiarkan hangus.

## Right issue itu baik atau buruk?

Tergantung **untuk apa** dananya:
- **Produktif** (ekspansi yang menambah laba, perkuat modal bank yang sehat) → bisa positif.
- **Menambal** (bayar utang karena bisnis loyo, atau jadi alat dilusi berulang) → waspada.

Baca keterbukaan informasi & tujuan penggunaan dana — sama seperti prospektus IPO.`,
    },
    {
      slug: "ipo-split-warrant",
      title: "Stock Split, Reverse Split & Warrant",
      readMinutes: 6,
      summary: "Aksi korporasi yang mengubah jumlah/harga saham — dan instrumen warrant.",
      body: `## Stock Split

**Stock split** memecah 1 saham jadi beberapa → harga per lembar **turun**, jumlah lembar **naik**, tapi **nilai total tidak berubah**.

Contoh split 1:5: harga Rp10.000 → jadi Rp2.000, lembarmu ×5.

Tujuan: harga jadi lebih "terjangkau" & likuiditas naik. **Bukan** berarti perusahaan jadi lebih bernilai — ini cuma "memotong pizza jadi lebih banyak irisan".

## Reverse Split

Kebalikannya: menggabungkan beberapa saham jadi 1 → harga per lembar **naik**, lembar **turun**. Sering dilakukan saham yang harganya nyaris Rp50 (gocap) untuk keluar dari "jurang".

> Reverse split sendiri **tidak memperbaiki bisnis** — sering jadi tanda perusahaan bermasalah. Hati-hati.

## Warrant (Waran)

**Waran** = hak (bukan kewajiban) membeli saham di **harga pelaksanaan (exercise price)** tertentu sampai **tanggal jatuh tempo**. Sering diberikan sebagai "pemanis" saat IPO/right issue (kode berakhiran -W).

- Kalau harga saham **di atas** exercise price sebelum jatuh tempo → waran bernilai (bisa di-exercise/jual).
- Kalau **di bawah** sampai jatuh tempo → waran **hangus tak bernilai** (nol).

> Waran sangat **volatil & leverage tinggi** — bisa naik/turun jauh lebih kencang dari sahamnya. Pahami exercise price & tanggal jatuh tempo sebelum menyentuhnya. Bukan untuk pemula.

## Catatan

Semua aksi korporasi ini diumumkan lewat **keterbukaan informasi** di IDX. Selalu cek tanggal & rasio resmi, jangan andalkan kabar grup.`,
    },
    {
      slug: "ipo-buyback-rups",
      title: "Buyback, Dividen, & RUPS",
      readMinutes: 6,
      summary: "Aksi korporasi yang mengembalikan nilai ke investor + forum keputusan tertinggi.",
      body: `## Buyback (Pembelian Kembali Saham)

**Buyback** = perusahaan membeli kembali sahamnya sendiri dari pasar.

Efek & makna:
- Mengurangi jumlah saham beredar → **EPS naik** (laba dibagi lembar lebih sedikit).
- Sinyal manajemen menganggap harga **undervalued**.
- Menopang harga saat pasar lesu.

> Buyback **berkualitas** dilakukan saat saham murah & kas kuat. Kalau dilakukan dengan utang saat harga mahal, justru tanda kurang sehat.

## Buyback vs Dividen

Keduanya cara mengembalikan nilai ke pemegang saham:
- **Dividen** → kas langsung ke investor (kena pertimbangan pajak).
- **Buyback** → menaikkan nilai per saham (capital gain), lebih fleksibel buat perusahaan.

## RUPS — forum tertinggi

**RUPS (Rapat Umum Pemegang Saham)** adalah forum pengambilan keputusan tertinggi. Ada dua jenis:
- **RUPS Tahunan (RUPST)** — sahkan laporan tahunan, **penetapan dividen**, ganti direksi/komisaris.
- **RUPS Luar Biasa (RUPSLB)** — keputusan khusus: right issue, akuisisi, perubahan anggaran dasar, dll.

Sebagai pemegang saham kamu **punya hak suara** (1 saham = 1 suara, umumnya). Banyak investor ritel mengabaikan ini — padahal keputusan RUPS (mis. dividen, dilusi) berdampak langsung ke nilai investasimu.

## Ringkas

| Aksi | Efek utama |
|---|---|
| Dividen | Kas ke investor |
| Buyback | EPS naik, topang harga |
| Right issue | Galang dana, risiko dilusi |
| Stock split | Harga turun, lembar naik (nilai tetap) |
| Warrant | Hak beli di harga tertentu (volatil) |

Pantau semua lewat keterbukaan informasi IDX, bukan dari rumor.`,
    },
  ],
};
