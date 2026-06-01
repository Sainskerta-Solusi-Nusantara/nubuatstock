// Modul Derivatif & Lindung Nilai — Academy Nubuat.
import type { AcademyModule } from "../content";

export const derivatifHedgingModule: AcademyModule = {
  slug: "derivatif-hedging",
  title: "Derivatif & Lindung Nilai",
  icon: "Scale",
  level: "Lanjutan",
  description:
    "Mengenal derivatif yang relevan di IDX (futures indeks & single stock futures), konsep opsi call/put, serta cara lindung nilai vs spekulasi — plus risiko leverage yang sering menghapus akun pemula.",
  lessons: [
    {
      slug: "dv-derivatif-idx",
      title: "Mengenal Derivatif IDX: Futures Indeks & Single Stock Futures",
      readMinutes: 7,
      summary:
        "Apa itu derivatif, kontrak berjangka indeks (IDX LQ45 Futures), Single Stock Futures (KBIE), plus leverage, margin, dan mark-to-market.",
      body: `## Apa itu derivatif?

**Derivatif** adalah instrumen keuangan yang nilainya **diturunkan (derived)** dari aset lain — disebut **underlying**. Underlying bisa berupa indeks (mis. LQ45), saham tunggal, komoditas, atau nilai tukar. Kamu tidak memiliki aset itu langsung; kamu memegang **kontrak** yang nilainya bergerak mengikuti harga underlying.

Berbeda dengan beli saham (kamu jadi pemilik perusahaan), derivatif lebih mirip **perjanjian** soal harga di masa depan. Dua ciri yang membuatnya berbahaya bagi pemula: **leverage** dan **mark-to-market harian**.

## Kontrak Berjangka Indeks (Index Futures)

IDX menyediakan **Kontrak Berjangka** atas indeks acuan, misalnya **IDX LQ45 Futures**. Karakteristiknya:

- **Underlying**: indeks (sekeranjang saham), bukan satu emiten.
- **Nilai kontrak** = level indeks dikalikan **multiplier** (pengali rupiah per poin) yang ditetapkan bursa.
- **Jatuh tempo (expiry)**: kontrak punya bulan kedaluwarsa. Mendekati expiry, posisi di-*settle* (umumnya **cash settlement** untuk indeks — tidak ada penyerahan fisik).
- **Bisa long maupun short**: kamu bisa untung saat indeks naik (long) atau saat indeks turun (short) — ini yang membuatnya berguna untuk **hedging**.

## Single Stock Futures (KBIE)

**Single Stock Futures (SSF)** — di IDX dikenal lewat produk **Kontrak Berjangka atas saham (KBIE)** — adalah kontrak berjangka dengan underlying **satu saham tertentu** (mis. saham bank besar). Konsepnya sama dengan futures indeks, tetapi pergerakannya mengikuti satu emiten, sehingga **lebih volatil** dibanding indeks yang sudah terdiversifikasi.

> Ketersediaan dan likuiditas produk derivatif bursa di Indonesia dapat berubah. Selalu cek spesifikasi kontrak resmi di situs IDX dan ketersediaan di sekuritasmu sebelum menganggap suatu produk bisa diperdagangkan ritel.

## Leverage, margin, dan mark-to-market

Inti risiko derivatif ada di tiga konsep ini:

- **Leverage (daya ungkit)**: kamu mengendalikan nilai kontrak besar hanya dengan menyetor sebagian kecil sebagai jaminan. Untung **dan** rugi dihitung dari **nilai penuh** kontrak, bukan dari modal jaminanmu.
- **Margin**: dana jaminan yang wajib mengendap. Ada **initial margin** (untuk buka posisi) dan **maintenance margin** (batas minimum). Bila ekuitas turun di bawah maintenance, kamu kena **margin call** — wajib top up atau posisi dilikuidasi paksa.
- **Mark-to-market (MTM)**: setiap akhir hari, posisimu dinilai ulang ke harga pasar. Laba/rugi harian langsung mengkredit/mendebit rekeningmu. Rugi tidak "nunggu sampai jual" — ia ditarik **setiap hari**.

### Ilustrasi leverage

| Item | Beli saham biasa | Futures (leverage ~10x) |
| --- | --- | --- |
| Modal disetor | Rp10.000.000 | Rp10.000.000 (margin) |
| Eksposur pasar | Rp10.000.000 | Rp100.000.000 |
| Underlying naik 5% | +Rp500.000 (+5% modal) | +Rp5.000.000 (+50% modal) |
| Underlying turun 5% | -Rp500.000 (-5% modal) | -Rp5.000.000 (-50% modal) |
| Underlying turun 10% | -Rp1.000.000 (-10%) | -Rp10.000.000 (**modal habis**) |

Angka di atas hanya ilustrasi konsep, bukan spesifikasi kontrak nyata. Perhatikan: pergerakan **kecil** pada underlying bisa **menghapus seluruh margin**.

## Beda dengan instrumen lain (ringkas)

- **vs Saham**: saham = kepemilikan, tanpa jatuh tempo, tanpa margin call. Derivatif = kontrak, ada expiry, ada leverage.
- **vs Waran** *(sudah dibahas di modul "Waran & Structured Warrant")*: waran adalah **hak** beli saham emiten dengan **kerugian maksimum = premi/harga waran** (tidak bisa rugi melebihi yang kamu bayar). Futures **berbeda** — pada futures kamu menanggung pergerakan penuh underlying dan **bisa rugi melebihi margin awal**. Jangan samakan keduanya.
- **vs Opsi**: opsi (dibahas di lesson berikutnya) memberi **hak**, sedangkan futures menciptakan **kewajiban** untuk menyelesaikan kontrak.

---

> **Disclaimer edukasi.** Materi ini bersifat edukasi literasi, **bukan ajakan, rekomendasi, atau anjuran** untuk membeli/menjual instrumen apa pun. Derivatif dan leverage **berisiko sangat tinggi**: kerugian dapat **melebihi modal/margin awal** dan terjadi sangat cepat. Pahami spesifikasi kontrak resmi, gunakan dana yang siap hilang, dan konsultasikan dengan profesional berizin sebelum mengambil keputusan.`,
    },
    {
      slug: "dv-konsep-opsi",
      title: "Konsep Opsi: Call & Put, Hak vs Kewajiban",
      readMinutes: 7,
      summary:
        "Memahami opsi secara edukatif — strike, premium, payoff long call & long put — lewat kata-kata dan tabel, bukan gambar ASCII.",
      body: `## Opsi = hak, bukan kewajiban

**Opsi (option)** memberi pemegangnya **hak — bukan kewajiban** — untuk membeli atau menjual underlying pada harga tertentu sampai/pada waktu tertentu. Untuk hak itu, pembeli membayar **premium** kepada penjual (writer) opsi.

Dua jenis dasar:

- **Call option**: hak untuk **membeli** underlying pada harga **strike**. Dipakai saat kamu memperkirakan harga **naik**.
- **Put option**: hak untuk **menjual** underlying pada harga **strike**. Dipakai saat kamu memperkirakan harga **turun**.

## Istilah inti

- **Strike (harga pelaksanaan)**: harga yang "dikunci" dalam kontrak opsi.
- **Premium**: harga yang dibayar pembeli opsi. Bagi **pembeli opsi**, premium ini adalah **kerugian maksimum** — tidak bisa rugi lebih dari premium yang dibayar.
- **Expiry (jatuh tempo)**: batas waktu hak berlaku.
- **Hak vs kewajiban**: **pembeli** opsi punya hak (boleh tidak dieksekusi). **Penjual/writer** opsi menanggung **kewajiban** bila pembeli mengeksekusi — risiko penjual bisa jauh lebih besar daripada premi yang diterimanya.

## Payoff long call (beli call)

Kamu untung bila harga underlying **naik melampaui** strike ditambah premium yang sudah kamu bayar. Bila harga di bawah strike saat jatuh tempo, kamu cukup membiarkan opsi hangus dan rugimu **terbatas pada premium**.

| Harga underlying saat expiry | Hasil long call |
| --- | --- |
| Jauh di bawah strike | Rugi = premium (maksimum, tetap) |
| Sama dengan strike | Rugi = premium |
| Strike + premium (impas) | Break-even (Rp0) |
| Di atas (strike + premium) | Profit, naik mengikuti kenaikan harga |

**Inti long call:** kerugian **terbatas** (premium), potensi profit **mengikuti** kenaikan harga underlying.

## Payoff long put (beli put)

Kebalikannya: kamu untung bila harga underlying **turun di bawah** strike dikurangi premium. Bila harga naik, opsi hangus dan rugimu lagi-lagi **terbatas pada premium**.

| Harga underlying saat expiry | Hasil long put |
| --- | --- |
| Jauh di atas strike | Rugi = premium (maksimum, tetap) |
| Sama dengan strike | Rugi = premium |
| Strike - premium (impas) | Break-even (Rp0) |
| Di bawah (strike - premium) | Profit, naik saat harga makin turun |

**Inti long put:** sering dipakai sebagai "asuransi" untuk melindungi posisi dari penurunan harga.

## Visualisasi payoff

![Diagram payoff long call dan long put: kerugian terbatas pada premium, potensi profit mengikuti pergerakan harga underlying](/academy/derivatif/payoff.svg)

Perhatikan bentuk "hockey stick": ada bagian datar (kerugian tetap sebesar premium) lalu garis miring (profit). Pada long call garis miring ke kanan-atas; pada long put garis miring ke kiri-atas.

> **Catatan ketersediaan di Indonesia.** Perdagangan **opsi saham untuk ritel di Indonesia masih sangat terbatas** dibanding pasar seperti AS. Materi opsi di sini diberikan sebagai **literasi konsep** agar kamu paham terminologi global, **bukan** sinyal bahwa instrumen ini mudah/umum diakses investor ritel domestik.

---

> **Disclaimer edukasi.** Penjelasan opsi ini murni **edukasi**, **bukan ajakan atau rekomendasi** transaksi. Sebagai **penjual/writer** opsi, kerugian bisa **tidak terbatas / melebihi modal**. Derivatif berisiko **sangat tinggi**. Jangan bertransaksi instrumen yang belum kamu pahami sepenuhnya, dan utamakan dana yang siap hilang.`,
    },
    {
      slug: "dv-hedging-vs-spekulasi",
      title: "Lindung Nilai (Hedging) vs Spekulasi",
      readMinutes: 8,
      summary:
        "Contoh hedging portofolio dengan short index futures, konsep hedging eksposur rupiah, beda hedging vs spekulasi, dan kenapa leverage menghapus akun pemula.",
      body: `## Dua tujuan memakai derivatif

Instrumen yang sama (mis. index futures) bisa dipakai untuk dua maksud yang **bertolak belakang**:

- **Hedging (lindung nilai)**: tujuannya **mengurangi risiko** atas posisi yang sudah kamu miliki. Kamu rela mengorbankan sebagian potensi untung demi **perlindungan**.
- **Spekulasi**: tujuannya **mencari untung dari pergerakan harga** dengan sengaja **menambah** eksposur risiko (sering dengan leverage besar).

| Aspek | Hedging | Spekulasi |
| --- | --- | --- |
| Tujuan | Mengurangi risiko posisi lain | Mengejar profit dari pergerakan harga |
| Hubungan dengan aset dasar | Punya eksposur yang dilindungi | Sering tanpa aset dasar |
| Dampak leverage | Membantu efisiensi modal lindung | Memperbesar untung **dan** rugi |
| Hasil ideal | Volatilitas/kerugian turun | Profit besar (tapi risiko besar) |
| Pemenang khas | Manajer risiko disiplin | Sangat sedikit; banyak akun habis |

## Contoh: hedging portofolio dengan short index futures

Misalkan kamu pegang portofolio saham blue chip senilai Rp100 juta yang korelasinya tinggi dengan indeks LQ45. Kamu khawatir pasar **turun jangka pendek** tetapi **tidak ingin menjual** sahamnya (alasan pajak, dividen, atau keyakinan jangka panjang).

Secara konsep, kamu bisa **short (jual) index futures** dengan nilai eksposur yang mendekati nilai portofoliomu:

- Jika **pasar turun**: portofolio sahammu rugi, tetapi posisi **short futures untung** — kerugian sebagian **ter-offset**.
- Jika **pasar naik**: portofolio sahammu untung, tetapi short futures rugi — sebagian untung "tergerus".

Itulah esensi hedging: kamu **menukar potensi untung ekstra dengan pengurangan risiko**. Hedging yang baik butuh perhitungan **hedge ratio** (berapa banyak kontrak agar offset-nya pas), dan tetap menyisakan **basis risk** (pergerakan portofolio tidak persis sama dengan indeks).

## Konsep hedging eksposur rupiah

Bila kamu (atau perusahaan) punya **kewajiban/pendapatan dalam mata uang asing** atau memegang aset luar negeri, pelemahan/penguatan rupiah memengaruhi nilai dalam rupiah. Secara konsep, eksposur nilai tukar ini dapat **dilindungi** memakai instrumen seperti **kontrak forward/futures valas atau swap** sehingga nilai tukar "dikunci" lebih awal.

Untuk investor ritel saham, poin praktisnya: **memahami bahwa pergerakan rupiah adalah salah satu sumber risiko**, terutama untuk emiten dengan utang/biaya dalam dolar. Penggunaan instrumen lindung nilai valas umumnya ranah korporasi/profesional, dan tetap membawa risiko & biaya sendiri.

## Kenapa leverage menghapus akun pemula

- **Pergerakan kecil = dampak besar.** Karena untung/rugi dihitung dari **nilai penuh** kontrak, gerakan 5–10% underlying bisa **menghabiskan margin**.
- **Margin call & likuidasi paksa.** Saat ekuitas jebol di bawah maintenance margin, posisi bisa **ditutup paksa** pada harga terburuk — sering tepat di titik kamu seharusnya bertahan.
- **MTM harian menekan psikologis.** Rugi ditarik tiap hari; banyak pemula **menggandakan posisi** untuk "balas dendam" dan justru mempercepat kehancuran.
- **Asimetri kehancuran.** Rugi 50% butuh untung 100% untuk balik modal. Leverage memperbesar peluang kamu mengalami drawdown sebesar itu.

## Prinsip manajemen risiko (wajib)

- Tentukan **risiko per posisi** sebelum masuk (mis. fraksi kecil dari modal), dan pakai **stop/exit** yang disiplin.
- **Position sizing** menyesuaikan leverage — bukan memakai margin maksimal "karena bisa".
- **Pahami spesifikasi kontrak** (multiplier, margin, expiry, jam dagang, mekanisme settlement) dari sumber resmi IDX/sekuritas.
- Bedakan dengan jelas: apakah kamu sedang **hedging** (punya aset yang dilindungi) atau **berspekulasi** (menambah risiko). Jangan tertukar.
- Mulai dari **literasi & simulasi**, bukan uang panas.

---

> **Disclaimer edukasi.** Seluruh materi ini adalah **edukasi & literasi**, **bukan ajakan, rekomendasi, sinyal, atau anjuran** membeli/menjual instrumen apa pun. Derivatif dan strategi berleverage (futures, opsi, lindung nilai) **berisiko sangat tinggi** — kamu dapat **kehilangan seluruh modal bahkan rugi melebihi modal/margin**. Keputusan investasi adalah tanggung jawabmu sendiri; pertimbangkan konsultasi dengan profesional berizin dan hanya gunakan dana yang siap hilang.`,
    },
  ],
};
