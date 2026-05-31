/**
 * Academy module: Bandarmology Lanjutan.
 *
 * Lanjutan dari modul "Bandarmology 101" (di content.ts). Kalau 101 mengenalkan
 * konsep bandar, akumulasi/distribusi, dan broker summary dasar, modul ini masuk
 * lebih dalam ke ALIRAN DANA: broker flow (net buy/sell, concentration, rotation),
 * foreign flow & kaitannya dengan IHSG + big caps, broker footprint (markup/markdown),
 * deteksi "bandar beraksi", lalu praktik menggabungkannya dengan Wyckoff & Verdict
 * di tab Bandarmology /ticker.
 *
 * Konten static & fully typed (sama dengan content.ts). Diagram dirender lewat
 * markdown image `![alt](/academy/bandarmology-lanjutan/NAMA.svg)` (SVG self-hosted
 * di public/academy/bandarmology-lanjutan/). Tidak ada raw HTML — LessonMarkdown
 * hanya mendukung markdown + remark-gfm.
 *
 * Di-wire ke ACADEMY_MODULES secara terpisah (lihat content.ts).
 */
import type { AcademyModule } from "../content";

export const bandarmologyLanjutanModule: AcademyModule = {
  slug: "bandarmology-lanjutan",
  title: "Bandarmology Lanjutan",
  icon: "Radar",
  level: "Menengah",
  description:
    "Naik level dari Bandarmology 101: baca aliran dana lewat broker flow, broker concentration & rotation, foreign flow vs IHSG, broker footprint (markup/markdown), deteksi bandar beraksi, plus cara memadukannya dengan Wyckoff & Verdict di Nubuat.",
  lessons: [
    // ===================== LESSON 1 =====================
    {
      slug: "bl-recap-smart-money",
      title: "Recap & Kenapa 'Ikuti Smart Money'",
      readMinutes: 6,
      summary:
        "Ringkasan cepat Bandarmology 101 dan filosofi composite man: ikuti jejak uang besar, bukan kerumunan.",
      body: `## Recap & Kenapa "Ikuti Smart Money"

Selamat datang di **Bandarmology Lanjutan**. Modul ini mengandaikan kamu sudah paham dasar dari **Bandarmology 101** (siapa itu bandar, akumulasi vs distribusi, dan cara baca broker summary sederhana). Kalau belum, sebaiknya pelajari dulu modul itu.

### Recap singkat Bandarmology 101

- **Bandar** = investor berdana besar (institusi, asing, pemain lokal kakap) yang mampu menggerakkan harga.
- **Akumulasi** = uang besar mengumpulkan saham diam-diam di area bawah saat ritel pesimis.
- **Distribusi** = uang besar melepas saham ke ritel yang FOMO di area atas.
- **Broker summary** = ringkasan broker mana yang net beli/jual pada periode tertentu — jejak yang ditinggalkan uang besar.

### Filosofi inti: ikuti "smart money", bukan kerumunan

Bandarmology pada dasarnya adalah versi lokal dari ide klasik **"follow the smart money"**. Wyckoff menyebut pelaku besar ini sebagai **Composite Man** (Manusia Komposit): bayangkan seluruh aksi uang besar di sebuah saham seolah dilakukan oleh **satu orang cerdas** yang punya rencana.

> Asumsi Composite Man: pergerakan harga & volume yang penting **bukan acak** — ada pihak yang merancangnya untuk membeli murah lalu menjual mahal. Tugasmu adalah membaca rencananya, lalu **menumpang**, bukan melawan.

### Kenapa "ikuti smart money" masuk akal

| Alasan | Penjelasan |
| --- | --- |
| **Informasi & modal** | Uang besar punya riset, akses, dan dana untuk menggerakkan harga. |
| **Jejak tak terhindarkan** | Posisi besar tidak bisa dibangun/dilepas tanpa meninggalkan jejak di volume & broker summary. |
| **Ritel sering salah waktu** | Mayoritas ritel beli saat euforia (distribusi) dan jual saat panik (akumulasi) — persis kebalikan. |

### Yang akan kamu pelajari di modul ini

1. **Broker flow mendalam** — net buy/sell, *concentration*, dan *rotation*.
2. **Foreign flow** — aliran dana asing dan kaitannya dengan IHSG & saham big caps.
3. **Broker footprint** — membaca akumulasi/distribusi dari siklus markup–markdown.
4. **Deteksi bandar beraksi** — kombinasi pola volume + broker dominan + harga.
5. **Praktik di Nubuat** — menggabungkan semuanya dengan Wyckoff & Verdict.

> **Penting sejak awal:** bandarmology tetap **probabilistik**, bukan ramalan. "Mengikuti smart money" berarti mencari konfirmasi, bukan menebak. Selalu padukan dengan teknikal, fundamental, dan manajemen risiko.`,
    },

    // ===================== LESSON 2 =====================
    {
      slug: "bl-broker-flow-mendalam",
      title: "Broker Summary Mendalam: Net Flow, Concentration & Rotation",
      readMinutes: 9,
      summary:
        "Tiga lapis baca broker summary: net buy/sell, seberapa terkonsentrasi, dan rotasi broker dominan antarhari.",
      body: `## Broker Summary Mendalam

Di 101 kamu belajar membaca top buyers vs top sellers. Sekarang kita tambah **tiga lapis analisis** yang membuat bacaanmu jauh lebih tajam: **net flow, concentration, dan rotation**.

### Lapis 1 — Net flow (net buy/sell)

**Net flow** sebuah broker = total beli − total jual dalam periode tertentu (lot atau nilai Rupiah).

- **Net buy positif besar** → broker tersebut sedang menambah posisi.
- **Net sell negatif besar** → broker tersebut sedang melepas posisi.
- Yang lebih penting daripada angka satu hari: **konsistensi arah** beberapa hari.

| Broker | Buy (lot) | Sell (lot) | Net (lot) | Avg price |
| --- | --- | --- | --- | --- |
| YP | 120.000 | 20.000 | **+100.000** | 1.250 |
| CC | 80.000 | 15.000 | **+65.000** | 1.255 |
| KZ | 50.000 | 10.000 | **+40.000** | 1.248 |
| ritel (gabungan) | 60.000 | 265.000 | **−205.000** | 1.252 |

### Lapis 2 — Broker concentration

**Concentration** mengukur seberapa **terpusat** net buy di sedikit broker. Net buy yang menumpuk di 2–3 broker jauh lebih bermakna daripada tersebar merata.

![Broker concentration: net buy terkonsentrasi di sedikit broker besar, net sell tersebar di banyak broker ritel](/academy/bandarmology-lanjutan/broker-concentration.svg)

- **Terkonsentrasi (sedikit broker net buy besar)** → indikasi **satu pihak terorganisir** mengakumulasi (sinyal smart money kuat).
- **Tersebar (banyak broker net buy kecil-kecil)** → lebih mirip pembelian ritel ramai-ramai (sinyal lemah).
- Cara kasar mengukur: berapa persen total net buy disumbang **top 3 broker**. Makin tinggi, makin terkonsentrasi.

> Pola klasik akumulasi: **net buy terkonsentrasi** di sisi pembeli, sementara net sell **tersebar** di banyak broker ritel — uang besar mengumpulkan dari tangan ritel.

### Lapis 3 — Broker rotation

**Rotation** adalah **pergantian broker dominan dari hari ke hari**. Bandar sering memecah akumulasi lewat beberapa broker agar tidak mencolok.

![Broker rotation: broker dominan berganti antarhari saat akumulasi, lalu broker akumulator berbalik net sell saat distribusi](/academy/bandarmology-lanjutan/broker-rotation.svg)

- **Rotasi antar broker yang sama-sama net buy** beberapa hari → akumulasi estafet, biasanya **sehat**.
- **Broker yang sebelumnya akumulator tiba-tiba jadi net seller dominan** → waspada, bisa awal **distribusi**.
- Lacak juga **average price** broker dominan: kalau harga sekarang masih dekat avg price mereka, mereka belum untung → cenderung menahan harga.

### Ringkasan cara baca berlapis

| Lapis | Pertanyaan | Sinyal kuat |
| --- | --- | --- |
| **Net flow** | Siapa net buy/sell & seberapa konsisten? | Net buy konsisten beberapa hari |
| **Concentration** | Apakah net buy terpusat di sedikit broker? | Top 3 broker dominan |
| **Rotation** | Apakah broker dominan berganti / berbalik arah? | Rotasi tetap net buy = sehat |

> **Jangan baca 1 hari saja.** Akumulasi sejati terbentuk dari pola berhari-hari. Satu hari net buy besar bisa hanya *crossing* atau kebetulan.`,
    },

    // ===================== LESSON 3 =====================
    {
      slug: "bl-foreign-flow",
      title: "Foreign Flow: Aliran Dana Asing, IHSG & Big Caps",
      readMinutes: 8,
      summary:
        "Net foreign buy/sell sebagai indikator sentimen, dan kenapa ia paling terasa di IHSG dan saham big caps.",
      body: `## Foreign Flow

**Foreign flow** (aliran dana asing) adalah net beli/jual investor asing di bursa. Ini salah satu indikator sentimen paling dipantau di IDX karena dana asing cenderung **besar, terarah, dan menggerakkan indeks**.

### Net foreign buy vs net foreign sell

- **Net foreign buy** = asing beli lebih banyak daripada jual → arus masuk (*inflow*).
- **Net foreign sell** = asing jual lebih banyak daripada beli → arus keluar (*outflow*).

Angka ini dilaporkan harian, sering dipecah jadi pasar reguler vs negosiasi. Yang paling relevan untuk membaca tren biasanya **pasar reguler**.

![Foreign flow vs IHSG: net foreign buy mendorong indeks naik, net foreign sell menekan indeks](/academy/bandarmology-lanjutan/foreign-flow.svg)

### Kenapa kaitannya kuat dengan IHSG

Dana asing punya porsi besar dan cenderung masuk/keluar **serempak** mengikuti sentimen global (suku bunga The Fed, kurs Rupiah, risk-on/risk-off). Karena itu:

- **Inflow asing berkepanjangan** → biasanya searah dengan **IHSG menguat**.
- **Outflow asing berkepanjangan** → sering bertepatan dengan **IHSG tertekan**.

> Foreign flow lebih baik dibaca sebagai **tren multi-hari/minggu**, bukan satu hari. Satu hari outflow besar bisa karena rebalancing indeks atau satu transaksi blok, bukan perubahan sentimen.

### Kenapa paling terasa di big caps

Asing umumnya bermain di saham **likuid berkapitalisasi besar** (big caps: bank besar, telekomunikasi, konsumer) karena bisa masuk/keluar dalam jumlah besar tanpa terlalu menggerakkan harga sendiri.

| Tipe saham | Sensitivitas terhadap foreign flow |
| --- | --- |
| **Big caps likuid** | Tinggi — penggerak utama foreign flow |
| **Mid caps** | Sedang |
| **Small caps / gorengan** | Rendah — lebih digerakkan bandar lokal |

### Cara memakai foreign flow

1. **Konfirmasi arah indeks:** inflow konsisten memperkuat tesis bullish di big caps.
2. **Cek per saham:** lihat apakah saham incaranmu termasuk yang diburu/dilepas asing (broker asing di broker summary).
3. **Waspada divergensi:** harga big cap naik tapi asing terus net sell → kenaikan ditopang lokal, bisa rapuh.

> **Caveat:** "asing" di broker summary diidentifikasi dari broker berbendera asing — tidak selalu = investor asing murni (lokal bisa pakai broker asing dan sebaliknya). Perlakukan sebagai **proxy**, bukan kebenaran absolut.`,
    },

    // ===================== LESSON 4 =====================
    {
      slug: "bl-broker-footprint",
      title: "Akumulasi vs Distribusi lewat Broker Footprint",
      readMinutes: 9,
      summary:
        "Membaca siklus markup–markdown dari jejak broker untuk membedakan akumulasi sejati dan distribusi tersamar.",
      body: `## Akumulasi vs Distribusi lewat Broker Footprint

**Broker footprint** adalah jejak kumulatif yang ditinggalkan broker-broker besar sepanjang sebuah siklus harga. Membacanya membantumu menempatkan harga sekarang dalam **siklus akumulasi → markup → distribusi → markdown**.

![Broker footprint sepanjang siklus: akumulasi (broker besar net buy, harga datar), markup naik, distribusi (net sell ke ritel), markdown turun](/academy/bandarmology-lanjutan/broker-footprint.svg)

### Empat tahap siklus

| Tahap | Harga | Jejak broker | Aksi cerdas |
| --- | --- | --- | --- |
| **Akumulasi** | Datar di bawah | Broker besar net buy terkonsentrasi, ritel net sell | Pertimbangkan masuk bertahap |
| **Markup** | Naik | Broker akumulator menahan / nambah | Ikut tren, kelola risiko |
| **Distribusi** | Datar di atas | Broker besar berbalik net sell ke ritel | Kurangi / amankan profit |
| **Markdown** | Turun | Broker besar sudah keluar, ritel nyangkut | Hindari "tangkap pisau jatuh" |

### Membedakan akumulasi sejati vs jebakan

Tidak semua harga datar = akumulasi. Bedakan dengan footprint:

- **Akumulasi sejati:** harga sideways **tapi** broker besar net buy konsisten & terkonsentrasi; average price mereka dekat harga sekarang.
- **Sekadar sepi:** harga datar karena tidak ada minat — net flow kecil dan tersebar, tak ada broker dominan.

### Membedakan distribusi vs koreksi sehat

- **Distribusi:** harga di atas mulai loyo **sementara** broker akumulator berbalik jadi net seller dominan — sering dibarengi berita positif yang ramai (umpan ke ritel).
- **Koreksi sehat:** harga turun tapi broker besar **tetap net buy** (menambah saat diskon) — tren naik kemungkinan lanjut.

> **Markup tanpa footprint akumulasi sebelumnya** patut dicurigai — kenaikan yang tidak didahului pengumpulan oleh uang besar cenderung rapuh dan mudah dijatuhkan kembali (markdown cepat).

### Konfirmasi dengan average price

Average price broker dominan adalah petunjuk emas:

- Harga sekarang **jauh di atas** avg price akumulator → mereka sudah cuan besar, **risiko distribusi naik**.
- Harga sekarang **dekat/di bawah** avg price → mereka belum untung, cenderung **menahan/menambah** (support).

> Footprint adalah cerita berlapis. Baca **harga + net flow + concentration + average price** bersama-sama, jangan satu-satu.`,
    },

    // ===================== LESSON 5 =====================
    {
      slug: "bl-deteksi-bandar-beraksi",
      title: "Deteksi 'Bandar' Beraksi: Volume + Broker + Harga",
      readMinutes: 9,
      summary:
        "Kombinasi sinyal yang menandakan uang besar sedang bergerak, lengkap dengan contoh kasus langkah demi langkah.",
      body: `## Deteksi "Bandar" Beraksi

Bandar beraksi jarang terlihat dari satu data saja. Sinyal paling andal muncul saat **tiga hal menyatu**: pola **volume**, **broker dominan**, dan **perilaku harga**.

![Deteksi bandar beraksi: breakout harga didukung lonjakan volume dan satu broker dominan net buy, lalu broker yang sama berbalik net sell di puncak](/academy/bandarmology-lanjutan/bandar-detection.svg)

### Tiga pilar deteksi

1. **Volume** — lonjakan volume tak biasa, terutama saat harga menembus level penting.
2. **Broker dominan** — satu/sedikit broker menyumbang porsi besar net flow (concentration tinggi).
3. **Harga** — reaksi harga yang konsisten dengan jejak broker (naik saat diakumulasi, loyo saat didistribusi).

### Pola akumulasi (bandar mengumpulkan)

- Harga **sideways/turun pelan** di area bawah, tapi volume tetap ada.
- **Satu broker dominan net buy** konsisten beberapa hari (concentration tinggi).
- Sumbu bawah candle sering panjang (ada yang menyerap tekanan jual).
- Average price broker dominan menumpuk di kisaran sempit → zona akumulasi.

### Pola distribusi (bandar melepas)

- Harga di area atas **sulit naik lagi** meski berita positif ramai.
- Broker yang dulu akumulator **berbalik jadi net seller** dominan.
- Volume jual tinggi, sumbu atas candle panjang (ada yang menjual ke setiap kenaikan).

### Contoh kasus (ilustratif)

Saham **XYZ** (ilustrasi, bukan rekomendasi):

1. **Hari 1–5:** harga datar di ~Rp1.000, volume sedang. Broker **YP** net buy terkonsentrasi tiap hari; ritel net sell. → *indikasi akumulasi.*
2. **Hari 6:** harga **breakout** ke Rp1.080 dengan **volume melonjak 3×**; YP & CC dominan net buy. → *markup dimulai, smart money masih masuk.*
3. **Hari 7–10:** harga lanjut ke Rp1.300, volume tinggi sehat. → *ikut tren, geser stop loss naik.*
4. **Hari 11:** harga gagal naik di Rp1.320 meski ada berita ekspansi; **YP berbalik net sell** dominan, volume jual besar. → *waspada distribusi, amankan sebagian profit.*

### Tabel ringkas sinyal

| Sinyal | Akumulasi | Distribusi |
| --- | --- | --- |
| Lokasi harga | Bawah / awal naik | Atas / setelah naik besar |
| Volume | Naik bertahap | Tinggi tapi harga mentok |
| Broker dominan | Net buy terkonsentrasi | Berbalik net sell |
| Berita | Sepi / negatif | Ramai positif (umpan) |

> **Hati-hati jebakan:** *crossing* internal (satu broker di kedua sisi) bisa membuat volume & net flow terlihat ramai padahal semu. Selalu cek apakah broker dominan benar-benar **net** (bukan sekadar bolak-balik). Konfirmasi dengan price action sebelum bertindak.`,
    },

    // ===================== LESSON 6 =====================
    {
      slug: "bl-praktik-nubuat",
      title: "Praktik di Nubuat: Gabung dengan Wyckoff & Verdict",
      readMinutes: 8,
      summary:
        "Memadukan bandarmology lanjutan dengan Wyckoff & Nubuat Verdict di tab Bandarmology /ticker, plus caveat data & disclaimer.",
      body: `## Praktik di Nubuat

Teori sudah lengkap. Sekarang cara memakainya di Nubuat — dan yang terpenting, **menggabungkannya** dengan analisis lain agar keputusanmu berlapis, bukan menebak.

### Di mana melihatnya

1. Buka halaman emiten lewat **/ticker** (ketik kode saham yang kamu pantau).
2. Masuk ke **tab Bandarmology**.
3. Di sana kamu menemukan ringkasan broker flow, indikasi akumulasi/distribusi, dan skor/narasi yang mengolah data broker secara otomatis — persis konsep yang kamu pelajari di modul ini.

### Memadukan dengan Wyckoff

Bandarmology dan **Wyckoff** adalah pasangan alami: keduanya membaca jejak uang besar (Composite Man), hanya sudutnya beda.

| Sumbu | Wyckoff | Bandarmology Lanjutan |
| --- | --- | --- |
| Fokus | Struktur harga & volume (fase) | Identitas pelaku (broker/asing) |
| Pertanyaan | "Ada di fase apa?" | "Siapa yang beli/jual?" |
| Saling melengkapi | Memberi *konteks struktur* | Memberi *bukti pelaku* |

> Kombinasi terkuat: **Wyckoff bilang ini fase akumulasi** (Spring, tanda kekuatan) **dan** broker footprint menunjukkan **broker besar net buy terkonsentrasi**. Dua sudut, satu kesimpulan → keyakinan lebih tinggi.

### Memadukan dengan Nubuat Verdict

**Nubuat Verdict** merangkum kualitas, valuasi, momentum, dll. jadi satu pandangan. Gunakan bandarmology sebagai **lapis timing & konfirmasi pelaku** di atas Verdict:

1. **Verdict** → apakah ini saham yang layak secara kualitas/valuasi?
2. **Wyckoff** → di fase mana siklusnya?
3. **Bandarmology** → apakah uang besar benar-benar sedang masuk?

Tiga lapis ini saling mengunci. Kalau ketiganya sejalan, tesismu jauh lebih kuat daripada mengandalkan satu sinyal.

### Alur praktis singkat

1. Saring kandidat lewat **Verdict / Screener**.
2. Cek fase di **Wyckoff**.
3. Konfirmasi pelaku di **tab Bandarmology** (net flow, concentration, rotation, foreign flow).
4. Tentukan **entry, stop loss, target** — pakai manajemen risiko, bukan keyakinan buta.

### Caveat data vendor

- Data broker summary & foreign flow berasal dari **vendor pihak ketiga**; bisa ada **jeda waktu, revisi, atau ketidaklengkapan**.
- Label "asing" = berdasarkan **bendera broker**, bukan identitas investor sebenarnya — perlakukan sebagai **proxy**.
- *Crossing* internal dan transaksi negosiasi bisa mendistorsi angka net flow.
- Karena itu **jangan mengambil keputusan dari satu hari atau satu angka** — cari pola dan konfirmasi silang.

### Penutup & disclaimer

> **Disclaimer penting:** seluruh analisis bandarmology — manual maupun otomatis di Nubuat — adalah **alat bantu, bukan kepastian**. Jejak broker bersifat probabilistik dan bisa menyesatkan. Jangan jadikan satu-satunya dasar beli/jual. Selalu gabungkan dengan teknikal, fundamental, dan **manajemen risiko** (stop loss, position sizing), dan jangan pertaruhkan dana yang tidak siap kamu rugikan.

Kamu sekarang bisa membaca aliran dana lebih dalam: broker flow berlapis, foreign flow, footprint siklus, deteksi bandar, dan cara menyatukannya dengan Wyckoff & Verdict. Latih membaca tab Bandarmology rutin di saham likuid — keterampilan ini tajam karena jam terbang.`,
    },
  ],
};
