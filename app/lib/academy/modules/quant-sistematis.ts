// Modul Quant & Trading Sistematis — Academy Nubuat.
// Materi orisinal Nubuat tentang pendekatan kuantitatif & sistematis untuk
// investor/trader ritel di pasar IDX. Edukasi konsep, bukan ajakan jual/beli.
import type { AcademyModule } from "../content";

export const quantSistematisModule: AcademyModule = {
  slug: "quant-sistematis",
  title: "Quant & Trading Sistematis",
  icon: "Calculator",
  level: "Lanjutan",
  description:
    "Pendekatan kuantitatif untuk ritel: factor investing (Value, Momentum, Quality, Size, Low-Vol), membangun strategi berbasis rule, dan backtest yang jujur agar terhindar dari overfitting.",
  lessons: [
    {
      slug: "qs-factor-investing",
      title: "Factor Investing: Mesin di Balik Return",
      readMinutes: 8,
      summary:
        "Lima faktor klasik — Value, Momentum, Quality, Size, Low-Volatility — beserta metrik proxy dan catatan keterbatasannya di IDX.",
      body: `## Apa itu factor investing?

**Factor investing** adalah upaya menjelaskan kenapa sekelompok saham, secara sistematis dan berulang, memberi return berbeda dari pasar. Alih-alih menebak "saham A bagus karena saya suka produknya", pendekatan faktor bertanya: **karakteristik terukur apa** yang historisnya berkorelasi dengan return?

Faktor itu sifatnya **statistik**, bukan jaminan. Sebuah faktor bisa bekerja bertahun-tahun lalu "tidur" (underperform) bertahun-tahun berikutnya. Inti pendekatan kuantitatif adalah mendefinisikan faktor secara **objektif dan terukur**, lalu mengujinya — bukan mengandalkan firasat.

## Lima faktor klasik

### 1. Value
Premis: saham yang "murah" relatif terhadap fundamentalnya cenderung mengejar ketinggalan.
- **Proxy:** PER (Price-to-Earnings) rendah, PBV (Price-to-Book) rendah, EV/EBITDA rendah, dividend yield tinggi.
- **Intuisi:** pasar kadang terlalu pesimis pada perusahaan membosankan/terlupakan.

### 2. Momentum
Premis: saham yang sudah naik cenderung lanjut naik dalam horizon menengah; yang turun cenderung lanjut turun.
- **Proxy:** return 6–12 bulan terakhir (umumnya **tidak** memasukkan 1 bulan terakhir untuk hindari efek pembalikan jangka pendek).
- **Intuisi:** reaksi investor terhadap kabar baik/buruk sering bertahap, bukan langsung penuh.

### 3. Quality
Premis: perusahaan dengan fundamental sehat dan stabil dihargai lebih konsisten.
- **Proxy:** ROE tinggi, margin (gross/net) tinggi & stabil, utang (DER) terkendali, arus kas operasi positif, laba yang tidak naik-turun ekstrem.
- **Intuisi:** kualitas mengurangi risiko "kejutan buruk".

### 4. Size
Premis (historis di banyak pasar): saham kapitalisasi kecil bisa memberi return ekstra — sebagai kompensasi risiko & likuiditas.
- **Proxy:** market cap kecil (small/mid cap).
- **Peringatan:** di IDX, small cap sering **tidak likuid** dan rawan manipulasi; "premi size" mudah hilang termakan spread & slippage.

### 5. Low-Volatility
Premis: saham yang pergerakannya tenang justru bisa memberi return per unit risiko yang lebih baik (anomali low-vol).
- **Proxy:** standar deviasi return rendah, beta rendah.
- **Intuisi:** investor sering "overpay" untuk saham heboh berisiko tinggi.

## Ringkasan metrik proxy

| Faktor | Premis singkat | Metrik proxy umum |
|---|---|---|
| Value | Murah vs fundamental | PER rendah, PBV rendah, EV/EBITDA rendah, yield tinggi |
| Momentum | Tren berlanjut | Return 6–12 bulan (skip 1 bulan terakhir) |
| Quality | Fundamental sehat | ROE tinggi, margin stabil, DER rendah, OCF positif |
| Size | Premi small cap | Market cap kecil |
| Low-Volatility | Tenang menang | Stdev return rendah, beta rendah |

## Bukti & keterbatasan di pasar IDX

- **Sampel pendek & dangkal.** IDX punya sejarah lebih pendek dan jumlah emiten likuid lebih sedikit dibanding pasar maju, sehingga uji faktor rentan **noise**.
- **Likuiditas tidak merata.** Banyak saham jarang ditransaksikan; faktor seperti Value/Size bisa "menang di atas kertas" tapi sulit dieksekusi tanpa menggerakkan harga sendiri.
- **Konsentrasi sektor.** Bobot besar di perbankan & komoditas membuat sebagian "faktor" sebetulnya cuma taruhan sektor terselubung.
- **Faktor bisa berlawanan.** Value vs Momentum sering tarik-menarik; menggabungkan beberapa faktor (multi-factor) biasanya lebih stabil daripada bergantung satu faktor.

> **Disclaimer:** Materi ini edukasi konsep, **bukan ajakan jual/beli**. Faktor adalah kecenderungan statistik historis, bukan jaminan. Hasil masa lalu tidak menjamin hasil masa depan.`,
    },
    {
      slug: "qs-strategi-rule",
      title: "Dari Ide ke Rule: Membangun Strategi Sistematis",
      readMinutes: 7,
      summary:
        "Mengubah hipotesis menjadi rule entry/exit eksplisit, menyaringnya lewat Screener Nubuat, lalu menguji — objektif vs diskresioner.",
      body: `## Kenapa harus sistematis?

Pendekatan **diskresioner** (mengambil keputusan "berdasarkan feeling saat itu") sulit dievaluasi: kalau rugi, kamu tidak tahu apakah idenya salah atau eksekusinya yang melenceng. Pendekatan **sistematis** memaksa setiap keputusan punya alasan terukur, sehingga bisa **diuji, diperbaiki, dan diulang**.

| Aspek | Diskresioner | Sistematis (rule-based) |
|---|---|---|
| Dasar keputusan | Intuisi/penilaian saat itu | Rule eksplisit yang ditulis sebelumnya |
| Konsistensi | Berubah-ubah, terpengaruh emosi | Sama di setiap kondisi serupa |
| Bisa di-backtest? | Sulit/tidak | Ya, langsung |
| Risiko utama | Bias psikologis | Overfitting rule ke masa lalu |

## Alur membangun strategi

![Diagram alur trading sistematis: ide menjadi rule eksplisit, screening faktor, backtest out-of-sample, lalu eksekusi dengan manajemen risiko](/academy/quant/alur.svg)

### 1. Ide / hipotesis
Mulai dari kalimat yang bisa salah, misalnya: *"Saham IDX dengan momentum 6 bulan kuat dan ROE tinggi cenderung outperform 3 bulan ke depan."* Hipotesis yang baik **spesifik** dan **bisa diuji**.

### 2. Terjemahkan ke rule entry/exit eksplisit
Setiap kata sifat ("kuat", "tinggi") harus jadi angka.

- **Entry (contoh):** beli jika return 6 bulan masuk **20% teratas** universe **DAN** ROE > 15% **DAN** rata-rata nilai transaksi harian > Rp X (filter likuiditas).
- **Exit (contoh):** jual jika momentum keluar dari 50% teratas, **ATAU** kena stop-loss −12% dari harga beli, **ATAU** sudah ditahan 60 hari (time stop).
- **Sizing:** maksimal N% modal per posisi; jumlah posisi terbatas.

Rule yang baik **tidak menyisakan ruang tafsir**: dua orang dengan data sama harus menghasilkan keputusan sama.

### 3. Screening berbasis faktor
Di sinilah faktor dari lesson sebelumnya dipakai sebagai **saringan**. Lewat **fitur Screener Nubuat**, kamu bisa memfilter universe IDX dengan kriteria kuantitatif — misalnya PER & PBV (Value), return periode tertentu (Momentum), ROE & margin (Quality) — untuk menghasilkan **watchlist kandidat** yang sudah lolos rule, bukan daftar acak.

### 4. Backtest
Sebelum mempertaruhkan uang, uji rule pada data historis (dibahas tuntas di lesson berikutnya). Tujuannya bukan mencari rule yang "sempurna di masa lalu", tapi rule yang **masuk akal dan tahan banting**.

## Disiplin operasional

- **Tulis rule sebelum trading**, bukan sesudah melihat hasil.
- **Catat setiap penyimpangan** dari rule — itu data berharga.
- **Pisahkan ide dari eksekusi:** strategi bisa benar tapi gagal karena eksekusi buruk (slippage, telat masuk).
- **Satu perubahan per evaluasi:** kalau mengubah banyak rule sekaligus, kamu tak akan tahu mana yang berpengaruh.

> **Disclaimer:** Contoh angka di atas hanya **ilustrasi metodologi**, bukan rekomendasi. Ini edukasi, **bukan ajakan jual/beli**. Strategi apa pun bisa rugi; gunakan manajemen risiko.`,
    },
    {
      slug: "qs-backtest-jujur",
      title: "Backtest yang Jujur & Jebakan-Jebakannya",
      readMinutes: 8,
      summary:
        "Overfitting, look-ahead & survivorship bias, biaya transaksi, plus metrik (CAGR, max drawdown, Sharpe) — dan kenapa out-of-sample wajib.",
      body: `## Backtest: alat, bukan ramalan

**Backtest** adalah simulasi strategi pada data masa lalu untuk memperkirakan bagaimana ia *mungkin* berperilaku. Backtest yang jujur menjawab "apakah ide ini layak diuji lebih lanjut?" — **bukan** "berapa cuan saya nanti". Backtest yang menipu justru lebih berbahaya daripada tidak backtest sama sekali, karena memberi rasa percaya diri palsu.

## Jebakan paling umum

### Overfitting / curve-fitting
Menyetel rule sampai kurva ekuitas masa lalu terlihat indah. Semakin banyak parameter yang kamu "oprek", semakin besar peluang kamu cuma mencocokkan **noise**, bukan pola nyata. Gejalanya: rule penuh angka ajaib yang sangat spesifik (RSI 13,7? hold 23 hari?).

### Look-ahead bias
Strategi diam-diam memakai informasi yang **belum tersedia** saat keputusan dibuat — misalnya menyaring pakai laba kuartalan yang baru dirilis berminggu-minggu setelah tanggal "entry" di simulasi. Pastikan setiap data hanya dipakai **setelah** benar-benar publik.

### Survivorship bias
Hanya menguji saham yang **masih ada** hari ini, mengabaikan emiten yang delisting/bangkrut. Hasilnya terlalu optimis karena "yang kalah" dihapus dari sejarah.

### Data snooping / multiple testing
Mencoba ratusan kombinasi lalu memilih yang terbaik. Dengan cukup banyak percobaan, **selalu** ada yang tampak hebat secara kebetulan. Semakin banyak kamu mencoba, semakin tinggi standar bukti yang harus dipenuhi.

## Penangkalnya: out-of-sample & walk-forward

- **In-sample vs out-of-sample:** kembangkan rule pada satu periode (in-sample), lalu uji pada periode **terpisah yang belum pernah dilihat** (out-of-sample). Kalau performa anjlok drastis, kemungkinan besar overfit.
- **Walk-forward:** geser jendela waktu maju secara berulang — latih, uji periode berikutnya, geser, ulangi. Lebih mirip kondisi nyata di mana masa depan selalu "data baru".

## Biaya yang sering dilupakan

| Biaya | Dampak | Catatan IDX |
|---|---|---|
| Komisi broker | Mengurangi tiap transaksi | Beli + jual; strategi sering-trading paling terpukul |
| Slippage | Eksekusi meleset dari harga rencana | Parah di saham tidak likuid / spread lebar |
| Pajak transaksi jual | Potongan tiap penjualan | Wajib dimasukkan agar realistis |
| Dampak harga | Order besar menggerakkan harga sendiri | Relevan untuk small cap |

Backtest tanpa biaya nyaris selalu terlihat menggiurkan. Backtest **realistis** memasukkan komisi, pajak, dan asumsi slippage yang konservatif.

## Metrik yang harus dibaca bersamaan

- **CAGR** — return tahunan rata-rata. Jangan dibaca sendirian.
- **Max Drawdown** — penurunan terbesar dari puncak ke lembah. Ukuran "seberapa sakit" dan apakah kamu sanggup menahannya.
- **Sharpe Ratio** — return per unit volatilitas; menilai *kualitas* return, bukan sekadar besarnya.
- **Win rate vs payoff** — win rate tinggi belum tentu untung kalau rata-rata rugi jauh lebih besar dari rata-rata cuan. **Win rate × payoff** harus dilihat bersama.

Strategi dengan CAGR 25% tapi max drawdown 60% mungkin tidak layak ditahan oleh manusia biasa. Konsistensi sering lebih berharga daripada angka puncak.

## Backtest di Nubuat

Lewat **fitur Backtest Nubuat**, kamu bisa menguji rule sistematis pada data historis IDX, melihat metrik (CAGR, max drawdown, dan sejenisnya), serta membandingkan periode untuk mengecek apakah strategi bertahan **di luar** periode pengembangannya. Gunakan untuk **menyaring ide**, bukan untuk meyakinkan diri bahwa cuan sudah pasti.

> **Disclaimer:** **Hasil backtest masa lalu BUKAN jaminan hasil masa depan.** Materi ini edukasi metodologi, **bukan ajakan jual/beli** dan bukan rekomendasi investasi. Selalu pakai manajemen risiko dan modal yang siap kamu relakan.`,
    },
  ],
};
