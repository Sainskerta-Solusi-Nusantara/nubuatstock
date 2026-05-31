// Modul Dividend & Income Investing — Academy Nubuat.
import type { AcademyModule } from "../content";

export const dividendModule: AcademyModule = {
  slug: "dividend-income-investing",
  title: "Dividend & Income Investing",
  icon: "Coins",
  level: "Pemula",
  description:
    "Bangun arus kas pasif dari saham dividen IDX: yield, payout ratio, tanggal-tanggal penting, sampai menghindari dividend trap.",
  lessons: [
    {
      slug: "di-dasar-dividen",
      title: "Dasar Dividen: Dari Mana Uangnya?",
      readMinutes: 6,
      summary: "Apa itu dividen, kenapa perusahaan membagi laba, dan jenis-jenisnya.",
      body: `## Apa itu dividen?

**Dividen** adalah bagian laba perusahaan yang dibagikan ke pemegang saham. Kalau kamu punya saham, kamu ikut memiliki perusahaan — jadi berhak atas sebagian labanya (kalau dibagikan).

## Kenapa perusahaan bagi dividen?

- Perusahaan **matang** (mature) yang kasnya kuat tapi peluang ekspansi terbatas → lebih baik kembalikan ke investor.
- Sinyal **kesehatan & kepercayaan diri** manajemen.
- Menarik investor tipe **income** (mau arus kas, bukan cuma capital gain).

Sebaliknya, perusahaan **growth** sering menahan laba untuk ekspansi → dividen kecil/tidak ada. Itu bukan jelek; beda strategi.

## Jenis dividen

- **Tunai (cash)** — paling umum, uang masuk ke RDN.
- **Saham (stock dividend)** — dibagi dalam bentuk lembar saham tambahan.
- **Interim** — dibagi di tengah tahun buku (sebelum laba tahunan final).
- **Final** — dibagi setelah RUPS atas laba tahun buku penuh.
- **Spesial** — sekali waktu, mis. dari penjualan aset besar.

## Dua sumber return saham

1. **Capital gain** — harga naik.
2. **Dividend** — arus kas berkala.

Investor income fokus ke #2 untuk membangun *passive income*, sambil tetap menikmati #1.`,
    },
    {
      slug: "di-yield-payout",
      title: "Dividend Yield & Payout Ratio",
      readMinutes: 7,
      summary: "Dua rasio inti untuk menilai saham dividen — dan kenapa yield tinggi belum tentu bagus.",
      body: `## Dividend Yield

\`\`\`
Dividend Yield = Dividen per Saham (setahun) / Harga Saham × 100%
\`\`\`

Contoh: dividen Rp200/saham, harga Rp4.000 → yield = 5%.

Yield = "bunga" yang kamu dapat relatif harga beli. **Makin rendah harga belimu, makin tinggi yield efektifmu** (yon cost). Itu sebabnya beli saham dividen saat harga murah sangat menguntungkan jangka panjang.

## Payout Ratio

\`\`\`
Payout Ratio = Total Dividen / Laba Bersih × 100%
\`\`\`

Berapa persen laba yang dibagi.
- **Terlalu tinggi (>80-100%)** → rawan; perusahaan membagi hampir semua laba, dividen rapuh kalau laba turun (atau dibayar dari utang).
- **Sehat (±30-60%)** → ada ruang tumbuh + dividen berkelanjutan.
- **Rendah** → perusahaan menahan untuk ekspansi (growth) atau sedang berjaga.

> **Yield tinggi ≠ otomatis bagus.** Yield bisa tinggi karena **harga jatuh** (bisnis bermasalah) — itu jebakan (lihat lesson Dividend Trap).

## Cek konsistensi

Yang penting bukan dividen sekali besar, tapi **konsisten & tumbuh** bertahun-tahun. Cari emiten yang:
- Bagi dividen rutin ≥5 tahun,
- Tren dividen per saham naik/stabil,
- Payout ratio wajar,
- Laba & arus kas operasi sehat.`,
    },
    {
      slug: "di-tanggal-penting",
      title: "Tanggal Penting: Cum-Date, Ex-Date, Recording, Payment",
      readMinutes: 6,
      summary: "Kapan harus pegang saham agar dapat dividen — dan apa itu 'dividend run'.",
      body: `## Empat tanggal yang wajib dipahami

1. **Cum-Date (Cum Dividend)** — hari **terakhir** kamu bisa beli/pegang saham dan **masih berhak** dapat dividen.
2. **Ex-Date (Ex Dividend)** — sehari setelah cum-date. Beli di hari ini **tidak** dapat dividen. Harga biasanya **turun ±sebesar dividen** di pembukaan (penyesuaian wajar).
3. **Recording Date** — tanggal pencatatan pemegang saham yang berhak.
4. **Payment Date** — dividen masuk ke RDN-mu.

> **Aturan praktis:** Untuk dapat dividen, kamu harus **sudah pegang saham sampai cum-date** (beli paling lambat di cum-date).

## "Dividend run" & "Ex-date drop"

- Menjelang cum-date, harga sering naik karena banyak yang mau "ngejar" dividen → **dividend run**.
- Di ex-date, harga turun ±sebesar dividen → wajar, bukan rugi (kamu dapat dividennya).

> Jangan kaget harga "anjlok" di ex-date — itu mekanis. Yang perlu dievaluasi: apakah bisnisnya tetap layak dipegang.

## Strategi umum

- **Long-term income:** abaikan fluktuasi ex-date, fokus akumulasi saat murah & kumpulkan dividen bertahun-tahun.
- **Dividend capture (lanjutan, berisiko):** beli sebelum cum, jual setelah dapat hak — tapi sering tidak menguntungkan setelah pajak & ex-date drop. Bukan untuk pemula.

## Pajak

Dividen untuk investor individu dalam negeri bisa **bebas PPh final** jika **diinvestasikan kembali** di Indonesia sesuai ketentuan; jika tidak, dikenakan PPh final. Cek aturan terbaru DJP & konsultasikan bila perlu.`,
    },
    {
      slug: "di-dividend-trap",
      title: "Menghindari Dividend Trap",
      readMinutes: 6,
      summary: "Yield 12% yang menggiurkan bisa jadi sinyal bahaya. Cara menyaringnya.",
      body: `## Apa itu dividend trap?

**Dividend trap** = saham dengan yield yang kelihatan tinggi/menggoda, tapi sebenarnya **tidak berkelanjutan** atau menutupi masalah. Kamu tergiur yield, tapi harga terus turun dan dividen akhirnya dipangkas — rugi di dua sisi.

## Tanda bahaya

1. **Yield ekstrem (mis. >10-12%)** tanpa alasan jelas → sering karena harga jatuh duluan.
2. **Payout ratio >100%** → bagi dividen lebih besar dari laba (tidak masuk akal jangka panjang).
3. **Laba & arus kas operasi menurun** → sumber dividen mengering.
4. **Utang menumpuk** → dividen "dibiayai" utang, bukan laba sehat.
5. **Dividen dari pos non-recurring** (jual aset) → tahun depan belum tentu ada.
6. **Bisnis structural decline** → industrinya sedang menyusut.

## Checklist anti-trap

Sebelum tergiur yield tinggi, tanyakan:
- Apakah **laba bersih** stabil/naik beberapa tahun?
- Apakah **arus kas operasi** menutup dividen (bukan dari utang/jual aset)?
- Payout ratio **wajar** (<±70-80%)?
- Dividen **konsisten & tumbuh**, bukan sekali lonjakan?
- Kenapa yield setinggi ini — karena **bisnis bagus** atau karena **harga ambruk**?

> **Prinsip:** Dividen yang aman lebih berharga dari yield besar yang rapuh. Kualitas bisnis dulu, yield belakangan.

## Pakai di Nubuat

Cek **Nubuat Verdict** (faktor quality & value) + laporan keuangan emiten (lihat modul *Analisis Fundamental*) sebelum mengandalkan yield. Yield tinggi + Verdict lemah = lampu kuning.`,
    },
  ],
};
