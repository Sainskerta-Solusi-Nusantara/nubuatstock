// Modul Skema & Strategi Swing Trading — Academy Nubuat.
import type { AcademyModule } from "../content";

export const swingTradingModule: AcademyModule = {
  slug: "swing-trading",
  title: "Skema & Strategi Swing Trading",
  icon: "TrendingUp",
  level: "Menengah",
  description:
    "Menangkap ayunan harga beberapa hari sampai minggu: setup entry, manajemen posisi, exit & target, sampai risk-reward — dengan kombinasi tools Nubuat.",
  lessons: [
    {
      slug: "sw-apa-itu-swing",
      title: "Apa Itu Swing Trading & Cocok untuk Siapa",
      readMinutes: 6,
      summary: "Tangkap satu 'ayunan' tren, hold beberapa hari ke minggu — di antara scalping & investing.",
      body: `## Posisi swing trading

| Gaya | Holding period | Cek chart |
|---|---|---|
| Scalping/Day trade | menit – 1 hari | terus-menerus |
| **Swing trading** | **beberapa hari – minggu** | **harian, santai** |
| Investing | bulan – tahun | mingguan/bulanan |

Swing trading menangkap **satu ayunan** (swing) dalam tren — beli dekat titik balik bawah, jual saat ayunan ke atas matang. Tidak perlu pelototin layar seharian.

## Cocok untuk siapa?

- Punya pekerjaan lain (tak bisa pantau intraday).
- Sabar menunggu setup bagus, bukan FOMO tiap menit.
- Nyaman menahan posisi melewati beberapa malam (overnight risk).

## Prinsip inti

1. **Trade with the trend** — cari saham yang tren utamanya naik (di atas MA50/MA200), beli saat koreksi (pullback), bukan saat sudah terbang.
2. **Beli di area diskon** — dekat support / oversold, bukan saat euforia.
3. **Selalu punya exit plan** sebelum masuk — target & stop loss ditentukan di depan.
4. **Risk first** — tentukan berapa rugi maksimal per trade SEBELUM mikir profit.

> Swing trading bukan tebak-tebakan harian. Ia sistematis: setup → konfirmasi → eksekusi → kelola → exit. Disiplin > prediksi.

## Bekal wajib

Sebelum lanjut, kuasai: **Analisis Teknikal** (candlestick, support-resistance, indikator) + **Manajemen Risiko** (position sizing, stop loss) + **Psikologi**. Swing trading menggabungkan ketiganya.`,
    },
    {
      slug: "sw-setup-entry",
      title: "Setup Entry: Pullback, Breakout, Reversal",
      readMinutes: 8,
      summary: "Tiga skema entry klasik swing + konfirmasi yang dipakai.",
      body: `## 1. Pullback (paling andal di tren naik)

Saham tren naik → koreksi sehat ke area support (mis. MA20/MA50, atau garis tren) → muncul tanda berbalik → entry.

**Konfirmasi:**
- Harga menyentuh support & **menolak** (candle bullish: hammer, bullish engulfing).
- **Stochastic/RSI** keluar dari oversold & berbalik naik.
- Volume jual mengecil saat koreksi (selling pressure habis).

> Inti: beli "diskon" di saham yang struktur naiknya masih utuh (higher high / higher low).

## 2. Breakout (momentum)

Harga menembus **resistance penting** (level konsolidasi / high sebelumnya) dengan **volume membesar** → entry mengikuti momentum.

**Konfirmasi:**
- **Volume breakout > rata-rata** (tanpa volume = rawan false breakout).
- Penutupan **di atas** level, bukan cuma sundul sumbu.
- Idealnya setelah konsolidasi/squeeze (energi terkumpul).

**Hati-hati false breakout** — sebagian trader tunggu **retest** (harga balik uji level yang ditembus, lalu lanjut naik) untuk entry lebih aman.

## 3. Reversal (kontrarian, lebih berisiko)

Tangkap pembalikan dari downtrend ke uptrend. **Lebih sulit & berisiko** — jangan "menangkap pisau jatuh".

**Konfirmasi minimal:**
- Pola pembalikan jelas (double bottom, divergensi bullish RSI).
- Break struktur turun (harga buat higher high pertama).
- Volume akumulasi muncul.

> Untuk pemula: fokus dulu ke **pullback** dalam tren naik. Win-rate-nya paling ramah.

## Checklist entry (semua harus ✓)

1. Tren utama mendukung arah trade.
2. Ada setup jelas (pullback/breakout/reversal) + konfirmasi.
3. Level **stop loss** sudah ditentukan (di bawah support / invalidasi setup).
4. **Risk-reward minimal 1:2** (lihat lesson berikut).
5. Ukuran posisi sesuai aturan risiko.`,
    },
    {
      slug: "sw-exit-rrr-plan",
      title: "Exit, Risk-Reward & Trade Plan",
      readMinutes: 7,
      summary: "Tentukan target & stop di depan, jaga R:R, dan kelola posisi sampai keluar.",
      body: `## Risk-Reward Ratio (R:R)

\`\`\`
R:R = (Target - Entry) / (Entry - Stop Loss)
\`\`\`

Contoh: entry 1.000, stop 950 (risk 50), target 1.150 (reward 150) → R:R = **1:3**.

> Aturan emas: **minimal 1:2**. Dengan 1:2, kamu bisa profit walau hanya benar 40% dari waktu. Trade dengan R:R jelek (mis. 1:1 atau target < risk) — **skip**, sebagus apa pun "feeling"-nya.

## Menentukan exit

**Stop loss (wajib):** di bawah level invalidasi setup (mis. di bawah support / low ayunan). Kalau ditembus, tesis salah → keluar, jangan harap balik.

**Target profit:**
- Resistance berikutnya / high sebelumnya.
- Fibonacci extension.
- Atau **trailing stop** — geser stop naik mengikuti harga untuk membiarkan profit berjalan (let winners run).

**Partial exit:** jual sebagian di target 1 (amankan profit), sisanya di-trail untuk potensi lebih besar. Mengurangi penyesalan dua arah.

## Position sizing (ringkas)

Risiko per trade **maks 1–2% modal**. Dari situ hitung jumlah lot:
\`\`\`
Jumlah lot = (Modal x %risiko) / (jarak entry ke stop x 100)
\`\`\`
Jarak stop lebar → lot kecil; stop sempit → lot lebih besar. Risiko rupiahnya tetap sama. (Detail di modul Manajemen Risiko.)

## Trade plan 1 halaman

Sebelum entry, tulis:
- **Emiten & alasan** (setup apa, konteks tren).
- **Entry** di harga berapa / kondisi apa.
- **Stop loss** & **target** (R:R berapa).
- **Ukuran posisi** (lot) & risiko rupiah.
- **Skenario salah**: kapan akui salah & keluar.

Lalu **eksekusi sesuai rencana** — bukan sesuai emosi saat harga bergerak.

## Praktik di Nubuat

- **Screener** preset **Swing Santai** (Stochastic Slow 10,5,5) untuk cari kandidat oversold di tren naik.
- **Backtest** setup-mu sebelum pakai uang sungguhan.
- **Paper Trading** latih eksekusi tanpa risiko.
- **Alerts** untuk dikabari saat harga sentuh level entry/stop.

> Edukasi, bukan ajakan jual/beli. Tidak ada strategi yang 100% menang — yang membuat untung jangka panjang adalah **disiplin R:R + manajemen risiko**, bukan tebakan sempurna.`,
    },
  ],
};
