// Modul Analisis Transaksi (Tape Reading & Bandarmologi) — Academy Nubuat.
// Materi orisinal Nubuat tentang konsep umum membaca transaksi pasar.
import type { AcademyModule } from "../content";

export const analisisTransaksiModule: AcademyModule = {
  slug: "analisis-transaksi",
  title: "Analisis Transaksi (Tape Reading)",
  icon: "Receipt",
  level: "Menengah",
  description:
    "Membaca jejak transaksi: running trade, broker summary, net foreign, dan pola akumulasi-distribusi untuk menebak arah uang besar. Materi orisinal Nubuat (konsep umum tape reading & bandarmologi).",
  lessons: [
    {
      slug: "at-pengantar",
      title: "Kenapa Membaca Transaksi?",
      readMinutes: 6,
      summary: "Harga adalah hasil; transaksi adalah jejak siapa yang menggerakkannya.",
      body: `## Harga itu hasil, transaksi itu jejak

Chart menunjukkan **apa** yang terjadi pada harga. Analisis transaksi berusaha menjawab **siapa** dan **bagaimana** uang berpindah di baliknya — apakah ada pihak besar (institusi/"bandar") yang sedang mengumpulkan (akumulasi) atau melepas (distribusi) barang.

> Catatan: materi ini menyajikan **konsep umum** tape reading & bandarmologi (terinspirasi pendekatan analisis transaksi yang populer di kalangan praktisi lokal). Ini bukan reproduksi metode bermerek milik siapa pun, dan bukan ajakan jual/beli.

## Tiga lapis data transaksi

1. **Running trade** — aliran transaksi per tick (waktu, harga, volume, beli/jual agresif).
2. **Broker summary** — rekap broker mana net beli / net jual pada satu emiten dalam periode tertentu.
3. **Net foreign** — selisih beli vs jual investor asing.

## Apa yang dicari?

- **Jejak akumulasi** — pembelian bertahap & konsisten oleh broker/asing tertentu tanpa menaikkan harga liar.
- **Jejak distribusi** — pelepasan barang besar saat harga ramai (sering di puncak).
- **Konsistensi pemain** — broker yang sama net buy berhari-hari = sinyal lebih kuat dari sekadar 1 hari.

## Batasan penting (baca ini)

- Data broker bisa **menyesatkan**: 1 broker bisa mewakili banyak klien; institusi bisa pecah order ke banyak broker; ada crossing/tutup sendiri.
- Net foreign besar belum tentu "pintar" — asing juga bisa salah.
- Analisis transaksi adalah **konfirmasi/petunjuk**, bukan bola kristal. Selalu gabung dengan teknikal + fundamental + manajemen risiko.

> Jangan jadikan "ikut bandar" sebagai keyakinan buta. Bandar bisa jebak ritel (bull trap / bear trap). Pakai sebagai salah satu lapis bukti, bukan satu-satunya.`,
    },
    {
      slug: "at-broker-summary",
      title: "Membaca Broker Summary & Net Foreign",
      readMinutes: 8,
      summary: "Cara baca siapa net beli/jual, average price-nya, dan apa artinya.",
      body: `## Anatomi broker summary

Broker summary merangkum, untuk satu emiten di rentang tanggal:
- Broker mana saja yang **net buy** (beli > jual) dan **net sell**.
- **Volume/nilai** transaksinya.
- **Average price** beli/jual tiap broker.

### Cara membacanya

1. **Lihat top net buyer** beberapa hari terakhir. Kalau broker besar (sering institusi) konsisten net buy → indikasi akumulasi.
2. **Average price net buyer** — kalau avg price mereka **di bawah harga sekarang**, mereka sudah untung & cenderung tahan; kalau **di atas**, mereka "nyangkut" → bisa jadi penopang harga (mereka tak mau rugi) ATAU sumber tekanan jual kalau menyerah.
3. **Bandingkan dengan harga** — akumulasi sehat: barang dikumpulkan tanpa menggoreng harga naik liar.

## Net foreign

\`\`\`
Net Foreign = Foreign Buy - Foreign Sell
\`\`\`

- **Foreign net buy** konsisten di big caps (LQ45) → sentimen risk-on, sering menopang IHSG.
- **Foreign net sell** deras → tekanan, biasanya saat gejolak global.

> Net foreign paling relevan di saham **likuid & besar**. Di saham gorengan kecil, asing jarang main; pergerakan lebih didominasi broker ritel/lokal tertentu.

## Pola yang sering muncul

- **Akumulasi diam-diam** — net buy konsisten, harga sideways/naik pelan, volume belum meledak.
- **Markup** — setelah terkumpul, harga didorong naik dengan volume membesar.
- **Distribusi** — saat ramai & euforia, net seller besar muncul, harga mulai berat naik.

Ini berima dengan siklus **Wyckoff** (lihat modul Wyckoff) — accumulation → markup → distribution → markdown.`,
    },
    {
      slug: "at-running-trade-praktik",
      title: "Running Trade & Praktik di Nubuat",
      readMinutes: 7,
      summary: "Baca tekanan beli/jual real-time + cara menggabungkan dengan analisis lain.",
      body: `## Running trade — denyut nadi pasar

Running trade menampilkan tiap transaksi real-time. Yang diperhatikan:
- **Trade di harga offer (beli agresif)** vs **di harga bid (jual agresif)** — siapa yang "ngejar".
- **Lot besar (big lot)** muncul berulang → ada pemain serius (hati-hati: bisa juga umpan).
- **Kecepatan** transaksi — makin cepat & deras, makin tinggi minat.

### Bid/offer imbalance

- Antrian **bid jauh lebih tebal** dari offer → tekanan beli (tapi bisa fake order yang ditarik).
- **Offer ditipiskan lalu disikat** → tanda mau didorong naik.

> Order book bisa **dimanipulasi** (spoofing: pasang order besar lalu tarik). Jangan percaya 100% pada ketebalan antrian — konfirmasi dengan transaksi yang BENAR-BENAR terjadi (running trade), bukan cuma niat (order book).

## Menggabungkan jadi satu tesis

Analisis transaksi paling kuat sebagai **konfirmasi**:

1. **Teknikal** kasih level (support/resistance, struktur) → lihat modul Analisis Teknikal.
2. **Transaksi** konfirmasi: di support, apakah ada **akumulasi** (net buy broker besar, beli agresif)?
3. **Fundamental/Verdict** pastikan bukan sekadar gorengan tanpa isi.
4. **Manajemen risiko** tentukan stop loss & sizing sebelum masuk.

## Praktik di Nubuat

- Gunakan tab **Bandarmology / Broker** di halaman emiten untuk melihat ringkasan broker & net foreign.
- Cek **Nubuat Verdict** sebagai pembanding kualitas.
- Untuk konteks pasar, lihat **Capital Flow** & **Rotation (RRG)**.

## Etika & kewaspadaan

- **Jangan ikut pump-and-dump.** Kalau harga sudah ARA berkali-kali tanpa fundamental, akumulasi "telat" = kamu jadi exit liquidity bandar.
- Analisis transaksi mengurangi ketidaktahuan, bukan menghapus risiko.

> Edukasi, bukan ajakan jual/beli. Data broker bersifat indikatif & bisa keliru — selalu verifikasi & kelola risiko sendiri.`,
    },
  ],
};
