// Modul Mekanisme Pasar & Order — Academy Nubuat.
import type { AcademyModule } from "../content";

export const mekanismeOrderModule: AcademyModule = {
  slug: "mekanisme-pasar-order",
  title: "Mekanisme Pasar & Order",
  icon: "Activity",
  level: "Pemula",
  description:
    "Hal teknis yang sering bikin pemula bingung: lot, fraksi harga, bid/offer, ARA/ARB, sesi & pre-opening, jenis order, dan settlement T+2.",
  lessons: [
    {
      slug: "mo-lot-fraksi-bidoffer",
      title: "Lot, Fraksi Harga & Bid/Offer",
      readMinutes: 6,
      summary: "Satuan beli saham, kelipatan harga yang sah, dan cara baca antrian order.",
      body: `## Lot — satuan beli

Di IDX, saham dibeli per **lot = 100 lembar**. Jadi beli "5 lot" = 500 lembar. Harga yang kamu bayar = harga per lembar × jumlah lembar.

Contoh: BBCA Rp10.000, beli 2 lot = 200 lembar × Rp10.000 = Rp2.000.000 (+ fee).

## Fraksi harga (tick size)

Harga saham hanya bisa bergerak dalam **kelipatan tertentu** sesuai rentang harganya:

| Rentang harga | Fraksi (tick) |
|---|---|
| < Rp200 | Rp1 |
| Rp200 – <Rp500 | Rp2 |
| Rp500 – <Rp2.000 | Rp5 |
| Rp2.000 – <Rp5.000 | Rp10 |
| ≥ Rp5.000 | Rp25 |

> Maka harga seperti Rp5.012 tidak sah untuk saham ≥Rp5.000 (harus kelipatan Rp25: 5.000, 5.025, ...). *(Fraksi bisa berubah sesuai aturan bursa — cek ketentuan terbaru.)*

## Bid & Offer (antrian)

![Order book: antrian bid (beli) hijau di kiri, offer (jual) merah di kanan, best price di tengah, dan spread di antaranya](/academy/mekanisme/bid-offer.svg)

- **Bid** = antrian **beli** (harga yang orang mau bayar).
- **Offer/Ask** = antrian **jual** (harga yang orang mau lepas).

Transaksi terjadi saat bid ketemu offer. Bid tertinggi & offer terendah ada di "best price".

- Mau **cepat kebeli** → pasang di harga offer (beli langsung sikat antrian jual).
- Mau **harga lebih murah** → pasang bid lebih rendah, antri, belum tentu kebeli.

Ketebalan antrian (jumlah lot di tiap harga) memberi gambaran tekanan beli/jual jangka pendek.`,
    },
    {
      slug: "mo-ara-arb-sesi",
      title: "ARA, ARB, Sesi & Pre-Opening",
      readMinutes: 6,
      summary: "Batas naik-turun harian, jam perdagangan, dan kenapa harga 'loncat' di pembukaan.",
      body: `## ARA & ARB (batas harian)

Untuk meredam volatilitas, bursa membatasi gerak harga harian:
- **ARA (Auto Reject Atas)** = batas **kenaikan** maksimum hari itu.
- **ARB (Auto Reject Bawah)** = batas **penurunan** maksimum hari itu.

Order di luar batas otomatis ditolak. Persentase batas tergantung rentang harga & ketentuan bursa (mis. saham murah punya batas % lebih lebar; saham IPO punya batas khusus yang lebih longgar di awal).

> Saham yang "ARA berhari-hari" sering jadi tanda **gorengan** — naik liar lalu bisa ambruk ARB beruntun. Hati-hati FOMO.

## Sesi perdagangan

Perdagangan reguler dibagi 2 sesi (Senin–Jumat), dengan jeda istirahat. Ada juga:
- **Pre-opening** — sebelum sesi 1 dibuka, order dikumpulkan untuk menentukan **harga pembukaan**. Itu sebabnya harga bisa "loncat" dari closing kemarin saat market buka.
- **Pre-closing & closing auction** — menentukan harga penutupan.

*(Jam pasti bisa berubah; cek jadwal resmi IDX.)*

## Papan perdagangan

- **Reguler** — transaksi normal per lot, settlement T+2.
- **Tunai** — settlement lebih cepat (khusus kondisi tertentu).
- **Negosiasi** — transaksi nego di luar mekanisme lelang reguler (mis. blok besar).

Pemula hampir selalu di **papan reguler**.`,
    },
    {
      slug: "mo-jenis-order-settlement",
      title: "Jenis Order & Settlement T+2",
      readMinutes: 5,
      summary: "Limit vs market order, dan kapan saham/uang benar-benar berpindah.",
      body: `## Jenis order

- **Limit order** — kamu tentukan harga. Hanya tereksekusi di harga itu atau lebih baik. Kontrol harga, tapi belum tentu kebeli/kejual. **Default & paling aman untuk pemula.**
- **Market order** — eksekusi di harga pasar terbaik saat itu. Cepat kebeli, tapi bisa kena harga kurang ideal kalau antrian tipis.

Sebagian aplikasi punya fitur tambahan: **auto order / GTC** (good-till-cancelled), **stop loss / trailing** (jual otomatis saat harga turun ke level tertentu — bantu disiplin risiko).

## Settlement T+2

Saat kamu **beli**, saham masuk ke rekening efek **2 hari bursa kemudian (T+2)**; uang juga ditarik di T+2. Saat **jual**, dana cair (bisa ditarik) di **T+2**.

Artinya: jual saham hari ini, uangnya baru bisa ditarik ke rekening bank ~2 hari kerja lagi. Tapi **dana hasil jual biasanya sudah bisa dipakai beli saham lain di hari yang sama** (tergantung sekuritas).

## Biaya transaksi

Tiap transaksi kena **fee broker** (mis. ±0,15% beli, ±0,25% jual — termasuk pajak & levy; angka beda tiap sekuritas). Fee jual lebih besar karena ada PPh final 0,1% dari nilai jual. Hitung fee saat menentukan target profit — scalping tipis bisa habis di fee.

## Ringkas

| Konsep | Inti |
|---|---|
| Lot | 100 lembar |
| Fraksi | kelipatan harga sah |
| Bid/Offer | antrian beli/jual |
| ARA/ARB | batas naik/turun harian |
| Limit/Market | kontrol harga vs kecepatan |
| T+2 | saham/dana berpindah 2 hari bursa |

Kuasai ini dulu sebelum eksekusi order pertama — biar tidak kaget. Edukasi, bukan ajakan transaksi.`,
    },
  ],
};
