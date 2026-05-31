// Modul Money Flow & Market Timing — Academy Nubuat.
// Materi orisinal Nubuat tentang konsep aliran dana & timing (terinspirasi
// pendekatan analisis yang populer di kalangan praktisi, tanpa klaim merek/tokoh).
import type { AcademyModule } from "../content";

export const moneyFlowTimingModule: AcademyModule = {
  slug: "money-flow-timing",
  title: "Money Flow & Market Timing",
  icon: "Waypoints",
  level: "Menengah",
  description:
    "Membaca aliran dana (money flow) & konsep timing pasar: indikator MFI/OBV, akumulasi-distribusi, smart money, plus seasonality & siklus — dengan disiplin & disclaimer.",
  lessons: [
    {
      slug: "mf-money-flow",
      title: "Money Flow: Mengukur Aliran Dana",
      readMinutes: 7,
      summary: "Volume + harga = jejak ke mana uang mengalir. Kenali MFI, OBV, A/D.",
      body: `## Ide dasar money flow

Harga saja tidak cukup; **volume mengonfirmasi** keseriusan pergerakan. **Money flow** menggabungkan harga + volume untuk menebak apakah uang sedang **masuk (akumulasi)** atau **keluar (distribusi)** dari sebuah saham.

> Catatan: ini materi orisinal Nubuat soal **konsep umum** money flow (terinspirasi pendekatan analisis aliran dana yang populer di kalangan praktisi lokal). Bukan reproduksi metode bermerek; bukan ajakan jual/beli.

## Tiga indikator inti

### 1. OBV (On-Balance Volume)
Menjumlahkan volume: **+volume** di hari naik, **−volume** di hari turun.
- OBV **naik** sementara harga sideways → ada **akumulasi** diam-diam (sinyal bullish dini).
- OBV **turun** sementara harga naik → **divergensi bearish** (kenaikan tidak didukung volume).

### 2. MFI (Money Flow Index)
"RSI versi volume" — skala 0-100.
- **MFI > 80** → overbought (uang masuk berlebihan).
- **MFI < 20** → oversold (tekanan jual berlebihan).
- **Divergensi** MFI vs harga = sinyal pembalikan potensial.

### 3. Accumulation/Distribution (A/D Line)
Mengukur apakah penutupan cenderung dekat high (akumulasi) atau low (distribusi), dikalikan volume.
- A/D naik = pembeli mengontrol; A/D turun = penjual mengontrol.

## Konsep "smart money" vs "dumb money"

- **Smart money** (institusi/pemain besar) cenderung **akumulasi saat sepi/murah**, distribusi saat ramai/mahal.
- **Dumb money** (ritel FOMO) cenderung kebalikannya — beli di puncak euforia, panik jual di dasar.

Tujuan baca money flow: **ikut arah smart money**, bukan jadi exit liquidity.

> Hati-hati: indikator money flow bisa memberi sinyal palsu, dan "smart money" juga bisa salah. Selalu **konfirmasi** dengan struktur harga + konteks (lihat modul Analisis Teknikal & Analisis Transaksi).`,
    },
    {
      slug: "mf-divergensi-konfirmasi",
      title: "Divergensi & Konfirmasi Aliran Dana",
      readMinutes: 6,
      summary: "Saat harga dan aliran dana 'tidak sepakat' — sering jadi sinyal dini pembalikan.",
      body: `## Divergensi = sinyal dini

**Divergensi** terjadi saat **harga** dan **indikator money flow** bergerak berlawanan. Sering mendahului pembalikan.

### Bullish divergence
- Harga buat **lower low** (turun lebih dalam), TAPI
- OBV/MFI/A/D buat **higher low** (tekanan jual mulai habis).
- → Potensi **pembalikan naik**. Smart money mulai akumulasi diam-diam.

### Bearish divergence
- Harga buat **higher high** (naik lagi), TAPI
- Money flow buat **lower high** (kenaikan tidak didukung volume).
- → Potensi **pembalikan turun**. Distribusi tersembunyi.

## Konfirmasi volume pada breakout

- **Breakout dengan volume besar** → kuat, uang sungguhan masuk.
- **Breakout volume tipis** → rawan **false breakout**.

> Aturan praktis: jangan percaya pergerakan harga yang **tidak didukung aliran dana**. Harga bisa "dipancing" sesaat; volume & money flow lebih sulit dipalsukan dalam jangka menengah.

## Menggabungkan jadi tesis

1. **Struktur harga** (support/resistance, tren) — modul Teknikal.
2. **Money flow** (OBV/MFI/A/D) konfirmasi akumulasi/distribusi.
3. **Analisis transaksi** (broker summary, net foreign) — siapa yang gerakkan.
4. **Manajemen risiko** — stop loss & sizing.

Empat lapis ini saling menguatkan. Satu indikator sendirian = rapuh.`,
    },
    {
      slug: "mf-market-timing",
      title: "Market Timing: Siklus, Seasonality & Realita",
      readMinutes: 7,
      summary: "Konsep timing pasar yang masuk akal — dan kenapa 'time in market' sering menang.",
      body: `## Apa itu market timing?

**Market timing** = usaha menentukan **kapan** masuk/keluar pasar berdasarkan analisis (siklus, momentum, kondisi makro), bukan asal beli-tahan.

> Materi ini menyajikan konsep timing yang **berbasis data & disiplin** — bukan ramalan pasti. Pendekatan timing apa pun (termasuk yang dipromosikan berbagai praktisi) tetap punya tingkat kesalahan. Sikapi dengan kepala dingin.

## Konsep timing yang masuk akal

1. **Siklus pasar (Wyckoff-style)** — akumulasi → markup → distribusi → markdown. Timing = kenali fase, beli di akhir akumulasi, hati-hati di distribusi (lihat modul Wyckoff).
2. **Siklus sektor (rotasi)** — uang berputar antar sektor; masuk sektor yang mulai dilirik (lihat modul Analisis Sektor & RRG).
3. **Momentum & money flow** — masuk saat aliran dana & momentum mendukung.
4. **Makro** — suku bunga, likuiditas, kurs (lihat modul Makro & Tema Pasar).

## Seasonality (pola musiman)

Pola berulang yang **sering** (bukan selalu) muncul:
- **Window dressing** — akhir kuartal/tahun, manajer investasi mempercantik portofolio → big caps sering terangkat.
- **"Santa rally" / January effect** — kecenderungan musiman akhir/awal tahun.
- **Musiman sektoral** — mis. konsumer jelang Lebaran.

> Seasonality = **kecenderungan statistik**, bukan jaminan. Tahun tertentu bisa berlawanan total. Jadikan bumbu, bukan dasar utama.

## Realita jujur: timing itu sulit

- **Banyak yang gagal** market timing — keluar terlalu cepat / masuk terlalu telat, malah kalah dari yang sekadar diam (buy & hold disiplin).
- **"Time in the market beats timing the market"** untuk mayoritas investor jangka panjang — konsistensi (DCA) sering kalahkan usaha menebak puncak/dasar.

## Sikap seimbang

- **Investor jangka panjang:** fokus DCA + pilih bisnis bagus; timing sekadar untuk menambah saat murah.
- **Trader:** timing memang inti pekerjaan, tapi WAJIB pakai **manajemen risiko & trading plan** (modul terkait) karena tingkat salah pasti ada.

> Hindari "guru timing" yang menjanjikan akurasi tinggi & untung pasti — itu lampu merah. Timing yang sehat = probabilistik, disiplin, dan selalu bersiap salah.

Edukasi, bukan ajakan jual/beli. Tidak ada metode timing yang akurat 100%.`,
    },
  ],
};
