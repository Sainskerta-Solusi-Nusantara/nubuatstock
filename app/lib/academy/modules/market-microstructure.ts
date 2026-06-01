import type { AcademyModule } from "../content";

export const marketMicrostructureModule: AcademyModule = {
  slug: "market-microstructure",
  title: "Market Microstructure IDX",
  icon: "Radar",
  level: "Lanjutan",
  description:
    "Bedah cara order benar-benar bertemu di Bursa Efek Indonesia: order book, aturan tick size & auto-rejection, sampai likuiditas, spread, dan slippage yang diam-diam menggerus hasil tradingmu.",
  lessons: [
    {
      slug: "ms-order-book-kedalaman",
      title: "Order Book & Kedalaman Pasar",
      readMinutes: 7,
      summary:
        "Membaca antrian bid/ask, depth, dan spread sebagai biaya tersembunyi — plus mengenali tembok order dan jebakannya.",
      body: `## Order Book: Tempat Harga Sebenarnya Terbentuk

Harga saham yang kamu lihat di layar bukan angka tunggal yang turun dari langit. Ia adalah hasil **tarik-menarik antrian** antara orang yang ingin membeli dan orang yang ingin menjual. Tempat antrian itu berkumpul disebut **order book** (buku pesanan) atau **kedalaman pasar** (market depth).

Order book punya dua sisi:

- **Bid (Permintaan)** — antrian harga yang **mau dibayar pembeli**. Disusun dari harga tertinggi ke bawah.
- **Offer / Ask (Penawaran)** — antrian harga yang **diminta penjual**. Disusun dari harga terendah ke atas.

Harga tertinggi di sisi bid disebut **best bid**, dan harga terendah di sisi ask disebut **best ask (best offer)**. Transaksi terjadi ketika ada yang bersedia "menyeberang" antrian — misalnya pembeli menaikkan harga sampai bertemu best ask.

![Ilustrasi order book: antrian bid di bawah harga dan ask di atas harga, dengan bid-ask spread di tengah](/academy/microstructure/orderbook.svg)

## Membaca "5 Besar" Antrian

Hampir semua aplikasi sekuritas menampilkan **5 antrian terbaik** di tiap sisi (sering disebut "5 besar" atau *depth 5*). Yang perlu kamu baca:

- **Harga** tiap level antrian.
- **Volume (lot)** yang menumpuk di tiap level — semakin tebal, semakin banyak minat di harga itu.
- **Jumlah order** (di sebagian platform) — 10.000 lot dari 1 order berbeda artinya dengan 10.000 lot dari 200 order ritel.

Cara cepat membacanya:

1. Lihat **best bid vs best ask** untuk tahu harga terbaik saat ini.
2. Lihat **ketebalan volume** — sisi mana yang lebih tebal sering (tapi tidak selalu) menunjukkan tekanan dominan.
3. Lihat **jarak antar level** — kalau antar level renggang, saham itu cenderung tipis/likuiditas rendah.

## Bid-Ask Spread = Biaya Tersembunyi

**Spread** adalah selisih antara best ask dan best bid. Ini sering dilupakan ritel, padahal ia adalah **biaya nyata**.

Contoh: best bid 1.250, best ask 1.255. Kalau kamu beli "asal jadi" di ask (1.255) lalu langsung mau jual di bid (1.250), kamu sudah rugi 5 poin **sebelum** harga bergerak sedikit pun. Pada saham likuid spread bisa cuma 1 tick; pada saham tipis spread bisa lebar dan menggerus hasil trading harianmu.

> Inti: makin lebar spread, makin mahal "ongkos masuk-keluar"-mu. Spread adalah pajak diam-diam untuk ketidaksabaran.

## Tembok Bid/Ask dan Jebakannya

**Tembok (wall)** adalah tumpukan volume sangat besar di satu level harga. Orang sering menafsirkannya sebagai sinyal:

- **Tembok bid besar** → seolah ada "lantai" penyangga harga.
- **Tembok ask besar** → seolah ada "atap" penahan harga.

Tapi hati-hati — order book bisa **menipu**:

- **Spoofing / order palsu**: order besar dipasang untuk menggiring persepsi, lalu **ditarik** sebelum benar-benar tereksekusi. Ini praktik yang dilarang regulator.
- **Layering**: banyak order bertingkat untuk menciptakan ilusi kedalaman.
- Tembok bisa **pindah** mengikuti harga, menandakan ia mungkin cuma alat psikologis, bukan komitmen beli/jual sungguhan.

Aturan praktis: jangan ambil keputusan hanya dari satu foto order book. Order book bersifat **dinamis** dan bisa berubah dalam hitungan detik. Gabungkan dengan konteks volume transaksi yang benar-benar *matched* (done), bukan sekadar antrian.

---

*Catatan edukasi: materi ini untuk pembelajaran, bukan ajakan membeli atau menjual efek tertentu. Tampilan order book dan istilahnya bisa berbeda antar sekuritas, dan aturan BEI dapat berubah sewaktu-waktu — selalu cek ketentuan resmi Bursa Efek Indonesia terkini.*`,
    },
    {
      slug: "ms-aturan-idx",
      title: "Aturan Mikrostruktur IDX",
      readMinutes: 8,
      summary:
        "Tick size, lot, papan pencatatan, sesi pre-opening/pre-closing, auto-rejection ARA/ARB, dan beda pasar reguler vs tunai vs negosiasi.",
      body: `## Aturan Main yang Wajib Kamu Tahu

Order tidak bisa dipasang di sembarang harga atau ukuran. Bursa Efek Indonesia (BEI) punya aturan mikrostruktur yang membatasi bagaimana order dibuat, kapan bisa transaksi, dan seberapa jauh harga boleh bergerak dalam sehari.

## Satuan Lot

Di BEI, **1 lot = 100 lembar saham**. Order di pasar reguler dipasang dalam kelipatan lot. Jadi kalau harga BBCA 9.500/lembar, modal minimal 1 lot ≈ 9.500 × 100 = Rp950.000 (di luar fee).

## Fraksi Harga (Tick Size)

**Tick size** adalah lompatan harga terkecil yang diizinkan. Besarnya **bertingkat** mengikuti rentang harga: makin tinggi harga saham, makin besar tick-nya.

| Rentang Harga (Rp) | Fraksi Harga / Tick (ilustrasi) |
| --- | --- |
| < 200 | 1 |
| 200 – < 500 | 2 |
| 500 – < 2.000 | 5 |
| 2.000 – < 5.000 | 10 |
| >= 5.000 | 25 |

Karena tick adalah lompatan terkecil, ia ikut menentukan **spread minimum**. Saham di rentang Rp5.000+ punya tick 25, sehingga spread paling sempit pun 25 poin — biaya masuk-keluarnya lebih besar daripada saham bertick 1.

> Angka di tabel hanya **ilustrasi umum**. BEI pernah beberapa kali merevisi struktur tick (termasuk uji coba penyederhanaan). Selalu cek aturan fraksi harga BEI yang berlaku saat ini.

## Papan Pencatatan

Saham dikelompokkan ke beberapa **papan** sesuai ukuran, kinerja, dan kondisinya:

- **Papan Utama** — emiten besar dengan rekam jejak & free float memadai.
- **Papan Pengembangan** — emiten yang belum memenuhi syarat Papan Utama.
- **Papan Ekonomi Baru** — emiten berbasis teknologi/pertumbuhan tinggi dengan kriteria khusus (mis. multiple voting shares).
- **Papan Pemantauan Khusus** — "ruang isolasi" untuk saham dengan kondisi tertentu (mis. harga sangat rendah, likuiditas/keuangan bermasalah). Saham di papan ini bisa kena mekanisme dagang khusus seperti **full call auction** dan batas auto-rejection yang berbeda.

Tahu posisi papan sebuah saham membantu menilai **risiko** dan **aturan dagang** yang melekat padanya.

## Sesi Perdagangan: Pre-Opening & Pre-Closing

Selain sesi reguler, ada sesi khusus untuk membentuk harga pembukaan dan penutupan secara adil:

- **Pre-opening** — order dikumpulkan sebelum pasar buka, lalu dibentuk satu **harga pembukaan** lewat lelang.
- **Pre-closing** — pengumpulan order untuk membentuk **harga penutupan**.
- **Random closing** — waktu pasti penutupan sesi pre-closing dibuat **acak** dalam rentang tertentu. Tujuannya mencegah manipulasi harga penutup ("marking the close") dengan order menit terakhir.

## Auto-Rejection: ARA & ARB

BEI membatasi seberapa jauh harga boleh bergerak dalam satu hari lewat **auto-rejection**:

- **ARA (Auto-Rejection Atas)** — batas kenaikan maksimum harian; order beli di atasnya ditolak.
- **ARB (Auto-Rejection Bawah)** — batas penurunan maksimum harian.

Persentasenya **bertingkat menurut rentang harga** dan kebijakan bursa (pernah simetris, pernah asimetris). Ilustrasi umum:

| Rentang Harga Acuan (Rp) | Batas ARA/ARB (ilustrasi) |
| --- | --- |
| 50 – 200 | ±35% |
| > 200 – 5.000 | ±25% |
| > 5.000 | ±20% |

Saham di Papan Pemantauan Khusus dan saham hasil IPO yang baru tercatat bisa memiliki batas auto-rejection yang **berbeda** dari tabel di atas.

> Sekali lagi: persentase ini **ilustratif**. BEI menyesuaikan batas ARA/ARB sesuai kondisi pasar (mis. pernah memperketat ARB saat pasar bergejolak). Cek ketentuan terkini sebelum mengandalkan angka tertentu.

## Pasar Reguler vs Tunai vs Negosiasi

| Segmen | Mekanisme | Penyelesaian | Catatan |
| --- | --- | --- | --- |
| **Reguler** | Lelang berkelanjutan, harga & lot baku | T+2 | Tempat mayoritas ritel bertransaksi |
| **Tunai** | Mirip reguler tapi penyelesaian cepat | T+0 | Sering dipakai untuk kebutuhan likuiditas/penyelesaian khusus |
| **Negosiasi** | Tawar-menawar langsung antar pihak, harga & jumlah disepakati | Sesuai kesepakatan | Untuk blok besar / tidak harus kelipatan lot reguler |

Bagi ritel, hampir semua aktivitas terjadi di **pasar reguler**. Tapi memahami keberadaan pasar tunai dan negosiasi penting agar tidak heran melihat transaksi besar di harga yang "aneh" — itu bisa terjadi di pasar negosiasi, di luar antrian reguler.

---

*Catatan edukasi: materi ini bersifat edukasi, bukan ajakan membeli atau menjual efek. Seluruh angka tick size, ARA/ARB, dan aturan papan di sini adalah ilustrasi yang dapat berubah — selalu rujuk peraturan Bursa Efek Indonesia yang berlaku saat kamu membacanya.*`,
    },
    {
      slug: "ms-likuiditas-slippage-eksekusi",
      title: "Likuiditas, Slippage & Eksekusi",
      readMinutes: 7,
      summary:
        "Kenapa likuiditas menentukan biaya nyata, bagaimana order besar bikin slippage di saham tipis, dan tips eksekusi market vs limit untuk ritel.",
      body: `## Kenapa Likuiditas Itu Segalanya

**Likuiditas** adalah seberapa mudah sebuah saham dibeli atau dijual **tanpa menggerakkan harga banyak**. Saham likuid (mis. blue chip dengan volume besar) punya antrian tebal dan spread sempit. Saham tipis (*illiquid*) punya antrian jarang, spread lebar, dan harga gampang "loncat".

Likuiditas menentukan dua biaya yang sering tak terlihat:

- **Spread** — selisih bid-ask (sudah dibahas di lesson 1).
- **Slippage** — selisih antara harga yang kamu *harapkan* dan harga *eksekusi sebenarnya*.

## Slippage Saat Order Besar di Saham Tipis

Slippage muncul karena order book punya **kedalaman terbatas**. Misalkan kamu pasang **market buy 5.000 lot** pada saham tipis dengan antrian ask berikut:

| Level Ask | Harga | Volume (lot) | Beli kumulatif |
| --- | --- | --- | --- |
| 1 | 500 | 1.000 | 1.000 |
| 2 | 510 | 1.500 | 2.500 |
| 3 | 525 | 1.000 | 3.500 |
| 4 | 540 | 2.000 | 5.500 |

Order 5.000 lot kamu akan "memakan" level 1 sampai sebagian level 4. **Harga rata-rata eksekusimu jauh di atas 500** — itulah slippage. Di saham likuid, 5.000 lot mungkin terserap di satu-dua tick; di saham tipis, kamu bisa menggerakkan harga sendiri dan jadi korban harga jelekmu sendiri.

> Aturan praktis: makin besar order relatif terhadap volume harian saham, makin besar slippage. Jangan jadi "ikan paus di kolam kecil".

## Market Order vs Limit Order

| Aspek | Market Order | Limit Order |
| --- | --- | --- |
| Prioritas | **Kepastian eksekusi** | **Kepastian harga** |
| Risiko | Slippage (harga bisa jelek) | Tidak tereksekusi (order nyangkut) |
| Cocok untuk | Saham likuid, butuh cepat keluar/masuk | Saham tipis, ingin kontrol harga |

Trade-off-nya jelas: **market order** menjamin kamu dapat barang tapi tidak menjamin harga; **limit order** menjamin harga tapi tidak menjamin tereksekusi. Pada saham tipis, market order adalah cara tercepat untuk membakar uang lewat slippage.

## Dampak ke Strategi Jangka Pendek

Untuk **scalping / day trading**, spread + slippage adalah lawan terbesar:

- Target profit harian sering tipis (beberapa tick). Kalau spread saja sudah memakan separuhnya, *edge*-mu hilang.
- Strategi frekuensi tinggi **wajib** memilih saham sangat likuid agar biaya transaksi terkendali.
- Hitung *break-even* dengan jujur: profit kotor harus menutup spread, slippage, **dan** fee beli-jual sekuritas.

## Iceberg / Hidden Order (Konsep)

**Iceberg order** adalah order besar yang hanya menampilkan **sebagian kecil** di order book; sisanya "tersembunyi di bawah permukaan" dan baru muncul setelah bagian yang tampak tereksekusi. Tujuannya menyembunyikan ukuran sesungguhnya agar tidak menggerakkan harga atau memancing reaksi pihak lain.

Implikasinya buat kamu: **antrian yang terlihat tipis belum tentu benar-benar tipis**. Bisa saja ada iceberg di baliknya. Ini alasan lain untuk tidak terlalu percaya pada satu foto order book. (Ketersediaan tipe order ini bisa berbeda antar platform/sekuritas.)

## Tips Eksekusi untuk Ritel

- **Cek likuiditas dulu**: lihat volume & nilai transaksi harian sebelum masuk. Hindari saham yang antriannya jarang kecuali kamu paham risikonya.
- **Pakai limit order** sebagai default, terutama di saham tipis. Jangan kejar harga dengan market order.
- **Pecah order besar** (*scaling in/out*) agar tidak menabrak banyak level sekaligus.
- **Hindari jam-jam sepi** (mis. menjelang istirahat) saat antrian menipis dan spread melebar.
- **Hitung total biaya**: spread + slippage + fee. Strategi yang menang di atas kertas bisa kalah karena biaya eksekusi.

---

*Catatan edukasi: materi ini untuk tujuan pembelajaran, bukan ajakan atau rekomendasi membeli/menjual efek. Contoh angka adalah ilustrasi. Ketersediaan tipe order, biaya, dan aturan dagang dapat berbeda antar sekuritas dan dapat berubah — selalu verifikasi dengan ketentuan Bursa Efek Indonesia dan sekuritasmu yang berlaku saat ini.*`,
    },
  ],
};
