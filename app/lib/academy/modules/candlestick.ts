/**
 * Academy module: Candlestick Patterns Lengkap.
 *
 * Modul khusus pola candlestick (20+ pola) — dikelompokkan jadi reversal
 * bullish, reversal bearish, indecision, dan continuation, lengkap dengan
 * cara membaca anatomi 1 candle dan cara memakai pola secara benar
 * (konfirmasi volume + lokasi support/resistance + kesalahan umum).
 *
 * Konten static & fully typed (sama dengan content.ts). Diagram dirender lewat
 * markdown image `![alt](/academy/candlestick-patterns/NAMA.svg)` (SVG
 * self-hosted di public/academy/candlestick-patterns/). Tidak ada raw HTML —
 * LessonMarkdown hanya mendukung markdown + remark-gfm.
 *
 * Di-wire ke ACADEMY_MODULES secara terpisah (lihat content.ts).
 */
import type { AcademyModule } from "../content";

export const candlestickModule: AcademyModule = {
  slug: "candlestick-patterns",
  title: "Candlestick Patterns Lengkap",
  icon: "CandlestickChart",
  level: "Menengah",
  description:
    "Lebih dari 20 pola candlestick yang wajib kamu kenali: reversal bullish & bearish, pola keraguan (doji & harami), dan pola lanjutan tren — plus cara memakainya dengan konfirmasi volume & lokasi support/resistance.",
  lessons: [
    // ===================== LESSON 1 =====================
    {
      slug: "cs-anatomi-dan-sentimen",
      title: "Membaca 1 Candle: Anatomi & Sentimen",
      readMinutes: 6,
      summary:
        "Recap cepat anatomi candlestick (body, wick, warna) dan apa yang diceritakannya soal psikologi pasar.",
      body: `## Membaca 1 Candle

Sebelum mengenal puluhan pola, kamu harus lancar membaca **satu candle**. Setiap candlestick merangkum perang antara pembeli (bull) dan penjual (bear) dalam satu periode (1 hari, 1 jam, dst).

![Anatomi candlestick: body, upper wick, dan lower wick untuk candle bullish hijau dan bearish merah](/academy/candlestick-patterns/anatomy.svg)

### Empat harga di setiap candle

Setiap candle merekam **OHLC**:

| Singkatan | Arti |
| --- | --- |
| **O**pen | Harga pembukaan periode |
| **H**igh | Harga tertinggi periode |
| **L**ow | Harga terendah periode |
| **C**lose | Harga penutupan periode |

### Body (badan)

**Body** adalah jarak antara **open** dan **close**:

- **Hijau (bullish)** → close **di atas** open. Pembeli menang.
- **Merah (bearish)** → close **di bawah** open. Penjual menang.
- **Body panjang** → satu pihak dominan (momentum kuat).
- **Body pendek** → tarik-menarik seimbang (ragu).

### Wick / shadow (sumbu)

**Wick** adalah garis tipis di atas/bawah body, menandai high & low ekstrem:

- **Upper wick panjang** → harga sempat naik tinggi lalu **ditolak turun** (tekanan jual di atas).
- **Lower wick panjang** → harga sempat jatuh lalu **ditolak naik** (tekanan beli di bawah).

### Apa yang diceritakan satu candle

> Body = **siapa yang menang**. Wick = **di mana harga ditolak**. Panjang relatif body & wick = **seberapa kuat** keyakinan pasar.

Contoh: candle dengan **body kecil hijau tapi lower wick sangat panjang** menunjukkan penjual sempat menekan harga jauh ke bawah, lalu pembeli merebut kembali dan menutup di atas — sinyal pembeli mulai bangkit.

### Kenapa pola butuh konteks

Satu candle jarang cukup. Kekuatan candlestick muncul saat **beberapa candle membentuk pola** dan pola itu berada di **lokasi penting** (support/resistance) **setelah tren tertentu**. Itulah yang akan kita pelajari di lesson berikutnya.

> Ingat sejak awal: candlestick adalah **alat baca sentimen jangka pendek**, bukan ramalan pasti. Selalu butuh konfirmasi.`,
    },

    // ===================== LESSON 2 =====================
    {
      slug: "cs-reversal-bullish",
      title: "Pola Reversal Bullish",
      readMinutes: 9,
      summary:
        "Hammer, Inverted Hammer, Bullish Engulfing, Piercing Line, Morning Star, Three White Soldiers, Tweezer Bottom.",
      body: `## Pola Reversal Bullish

Pola **reversal bullish** muncul **setelah tren turun** dan mengisyaratkan harga mungkin **berbalik naik**. Syarat mutlak: pola ini hanya bermakna kalau memang ada penurunan sebelumnya — di tengah tren naik, bentuk yang sama tak punya arti reversal.

![Empat pola reversal bullish: Hammer, Inverted Hammer, Piercing Line, Tweezer Bottom](/academy/candlestick-patterns/bullish-reversal.svg)

### 1. Hammer (palu)

Body kecil di **bagian atas** range, dengan **lower wick panjang** (≥ 2× body) dan hampir tanpa upper wick.

- **Cerita:** penjual menjatuhkan harga jauh, tapi pembeli merebut kembali sampai close mendekati high.
- Warna body boleh hijau/merah, tapi **hijau lebih kuat**.
- Muncul di **dasar** tren turun → sinyal pembalikan.

### 2. Inverted Hammer (palu terbalik)

Kebalikan posisi wick: body kecil di **bagian bawah**, **upper wick panjang**.

- **Cerita:** pembeli sempat mendorong harga jauh ke atas; meski ditolak, mereka menunjukkan minat beli setelah tren turun.
- Butuh **konfirmasi** candle hijau berikutnya.

### 3. Bullish Engulfing (penelan bullish)

Dua candle: candle **merah kecil** lalu candle **hijau besar** yang body-nya **menelan penuh** body merah sebelumnya.

![Bullish Engulfing dan Bearish Engulfing dibandingkan](/academy/candlestick-patterns/engulfing.svg)

- Salah satu pola reversal **paling kuat & populer**.
- Makin besar body hijau (dan makin besar volume), makin valid.

### 4. Piercing Line (garis penembus)

Dua candle: candle **merah besar** lalu candle **hijau** yang dibuka **di bawah** low candle merah (gap down) tapi ditutup **menembus lebih dari 50%** body merah.

- Mirip Bullish Engulfing tapi "kurang sempurna" (tidak menelan penuh).
- Tembus 50% adalah ambang minimum keseriusan pembeli.

### 5. Morning Star (bintang pagi)

Pola **3 candle** — sangat dihormati:

![Morning Star dan Evening Star: pola tiga candle](/academy/candlestick-patterns/star-patterns.svg)

1. Candle **merah besar** (tren turun lanjut).
2. Candle **kecil** (body mungil / doji) — keraguan, sering dengan gap.
3. Candle **hijau besar** yang menutup jauh ke dalam body candle pertama.

> Urutan "merah besar → kecil → hijau besar" = matahari terbit setelah malam. Reversal bullish kuat.

### 6. Three White Soldiers (tiga prajurit putih)

Tiga candle **hijau** beruntun, masing-masing membuka di dalam body sebelumnya dan menutup makin tinggi, dengan wick pendek.

![Three White Soldiers dan Three Black Crows](/academy/candlestick-patterns/soldiers-crows.svg)

- Sinyal momentum beli yang kokoh dan berkelanjutan.
- Waspada kalau candle ke-2/ke-3 wick atasnya memanjang (mulai ada penolakan).

### 7. Tweezer Bottom (penjepit bawah)

Dua candle (atau lebih) dengan **low yang hampir sama**, biasanya merah lalu hijau.

- Dua low identik = level support diuji dua kali dan **bertahan**.
- Sederhana tapi efektif di area support yang sudah dikenal.

### Tabel ringkas reversal bullish

| Pola | Jumlah candle | Ciri kunci |
| --- | --- | --- |
| Hammer | 1 | wick bawah panjang, body di atas |
| Inverted Hammer | 1 | wick atas panjang, body di bawah |
| Bullish Engulfing | 2 | hijau menelan merah |
| Piercing Line | 2 | hijau tembus &gt;50% body merah |
| Morning Star | 3 | merah besar → kecil → hijau besar |
| Three White Soldiers | 3 | 3 hijau naik beruntun |
| Tweezer Bottom | 2+ | dua low sama |`,
    },

    // ===================== LESSON 3 =====================
    {
      slug: "cs-reversal-bearish",
      title: "Pola Reversal Bearish",
      readMinutes: 9,
      summary:
        "Hanging Man, Shooting Star, Bearish Engulfing, Dark Cloud Cover, Evening Star, Three Black Crows, Tweezer Top.",
      body: `## Pola Reversal Bearish

Pola **reversal bearish** muncul **setelah tren naik** dan mengisyaratkan harga mungkin **berbalik turun**. Banyak di antaranya adalah **cermin** dari pola bullish — bentuknya sama, tapi lokasinya di puncak.

![Empat pola reversal bearish: Hanging Man, Shooting Star, Dark Cloud Cover, Tweezer Top](/academy/candlestick-patterns/bearish-reversal.svg)

### 1. Hanging Man (orang gantung)

Bentuk identik Hammer (body kecil di atas, lower wick panjang), tapi muncul di **puncak** tren naik.

- **Cerita:** penjual sempat menekan harga jauh ke bawah di tengah tren naik — peringatan tekanan jual mulai muncul.
- Butuh **konfirmasi** candle merah berikutnya.

### 2. Shooting Star (bintang jatuh)

Bentuk identik Inverted Hammer (body kecil di bawah, **upper wick panjang**), tapi di **puncak** tren naik.

- **Cerita:** pembeli mendorong harga tinggi lalu **dilibas penjual** sampai close turun lagi. Penolakan di puncak.

### 3. Bearish Engulfing (penelan bearish)

Candle **hijau kecil** lalu candle **merah besar** yang menelan penuh body hijau sebelumnya.

![Bullish Engulfing dan Bearish Engulfing dibandingkan](/academy/candlestick-patterns/engulfing.svg)

- Versi bearish dari Bullish Engulfing — sinyal reversal turun yang kuat di puncak.

### 4. Dark Cloud Cover (selimut awan gelap)

Candle **hijau besar** lalu candle **merah** yang dibuka di atas high candle hijau (gap up) tapi ditutup **menembus lebih dari 50%** body hijau.

- Versi bearish dari Piercing Line.
- Penjual merebut sebagian besar kenaikan hari sebelumnya.

### 5. Evening Star (bintang malam)

Pola **3 candle**, cermin dari Morning Star:

![Morning Star dan Evening Star: pola tiga candle](/academy/candlestick-patterns/star-patterns.svg)

1. Candle **hijau besar** (tren naik lanjut).
2. Candle **kecil** (body mungil / doji) — keraguan di puncak.
3. Candle **merah besar** yang menutup jauh ke dalam body candle pertama.

> "Hijau besar → kecil → merah besar" = matahari terbenam. Reversal bearish kuat.

### 6. Three Black Crows (tiga gagak hitam)

Tiga candle **merah** beruntun, masing-masing membuka di dalam body sebelumnya dan menutup makin rendah, dengan wick pendek.

![Three White Soldiers dan Three Black Crows](/academy/candlestick-patterns/soldiers-crows.svg)

- Tekanan jual berkelanjutan dan meyakinkan — sering menandai awal tren turun.

### 7. Tweezer Top (penjepit atas)

Dua candle dengan **high yang hampir sama**, biasanya hijau lalu merah.

- Dua high identik = level resistance diuji dua kali dan **ditolak**.

### Tabel ringkas reversal bearish

| Pola | Jumlah candle | Ciri kunci |
| --- | --- | --- |
| Hanging Man | 1 | wick bawah panjang, di puncak |
| Shooting Star | 1 | wick atas panjang, di puncak |
| Bearish Engulfing | 2 | merah menelan hijau |
| Dark Cloud Cover | 2 | merah tembus &gt;50% body hijau |
| Evening Star | 3 | hijau besar → kecil → merah besar |
| Three Black Crows | 3 | 3 merah turun beruntun |
| Tweezer Top | 2+ | dua high sama |

> **Trik mengingat:** banyak pola bullish & bearish adalah pasangan cermin. Yang menentukan artinya bukan cuma bentuk, tapi **lokasi** (dasar vs puncak) dan **tren sebelumnya**.`,
    },

    // ===================== LESSON 4 =====================
    {
      slug: "cs-indecision-doji-harami",
      title: "Pola Keraguan: Doji, Spinning Top, Harami",
      readMinutes: 8,
      summary:
        "Pola yang menandai keseimbangan/keraguan pasar — sering jadi titik balik atau jeda.",
      body: `## Pola Keraguan (Indecision)

Tidak semua candle bercerita "siapa menang". Sebagian justru menandai **keseimbangan / keraguan** — pembeli dan penjual sama kuat. Pola ini sering muncul **menjelang titik balik** atau jeda tren.

### Doji

**Doji** terjadi saat **open ≈ close** sehingga body-nya **nyaris tak punya tebal** (hanya garis tipis). Artinya: pertarungan berakhir imbang.

![Empat jenis Doji: standard, long-legged, dragonfly, gravestone](/academy/candlestick-patterns/doji-types.svg)

Ada beberapa varian:

| Jenis Doji | Bentuk | Makna |
| --- | --- | --- |
| **Standard** | wick atas & bawah seimbang | keraguan murni |
| **Long-legged** | kedua wick sangat panjang | volatilitas tinggi, bingung |
| **Dragonfly** | hanya wick bawah panjang | bias **bullish** (penolakan harga rendah) |
| **Gravestone** | hanya wick atas panjang | bias **bearish** (penolakan harga tinggi) |

- **Dragonfly** di dasar tren turun mirip Hammer → potensi reversal naik.
- **Gravestone** di puncak tren naik mirip Shooting Star → potensi reversal turun.

> Doji bukan sinyal arah sendirian. Ia berkata "momentum berhenti" — arah berikutnya ditentukan candle konfirmasi setelahnya.

### Spinning Top (gasing)

Body **kecil** di tengah, dengan **wick atas dan bawah** yang relatif panjang dan seimbang.

![Marubozu dan Spinning Top](/academy/candlestick-patterns/marubozu-spinning.svg)

- Mirip doji tapi body-nya masih ada (open ≠ close, hanya tipis).
- Menandai **kelelahan momentum**. Setelah tren panjang, ini peringatan tren mungkin melambat.
- Warna hijau/merah kurang penting; yang penting **body kecil + dua wick**.

### Harami

**Harami** (dari bahasa Jepang "hamil") = candle **besar** diikuti candle **kecil** yang body-nya **berada di dalam** body candle besar sebelumnya.

![Bullish Harami dan Bearish Harami](/academy/candlestick-patterns/harami.svg)

- **Bullish Harami:** merah besar → hijau kecil di dalamnya (setelah tren turun) → potensi reversal naik.
- **Bearish Harami:** hijau besar → merah kecil di dalamnya (setelah tren naik) → potensi reversal turun.
- **Harami Cross:** candle ke-2 berupa **doji** (body sangat kecil) → versi yang lebih kuat.

> Harami adalah **kebalikan** Engulfing: pada Engulfing candle ke-2 lebih besar, pada Harami candle ke-2 lebih kecil. Keduanya menandai momentum melemah.

### Kapan pola keraguan penting

Pola indecision paling berarti **setelah tren panjang yang kuat**. Di tengah konsolidasi mendatar, doji & spinning top muncul terus-menerus dan tidak banyak artinya. Konteks selalu menentukan.`,
    },

    // ===================== LESSON 5 =====================
    {
      slug: "cs-continuation",
      title: "Pola Continuation (Lanjutan Tren)",
      readMinutes: 7,
      summary:
        "Marubozu, Rising/Falling Three Methods, dan Gap — pola yang menegaskan tren berlanjut.",
      body: `## Pola Continuation

Tidak semua pola memprediksi pembalikan. **Pola continuation** mengisyaratkan tren yang sedang berjalan **akan berlanjut** setelah jeda singkat. Ini membantu kamu **bertahan di posisi** alih-alih keluar terlalu cepat.

### Marubozu

**Marubozu** = candle dengan body **penuh tanpa wick** (atau wick sangat tipis). Open & close berada tepat di ekstrem range.

![Marubozu dan Spinning Top](/academy/candlestick-patterns/marubozu-spinning.svg)

- **Marubozu hijau:** open = low, close = high → tekanan **beli** total. Bullish kuat.
- **Marubozu merah:** open = high, close = low → tekanan **jual** total. Bearish kuat.
- Muncul searah tren = konfirmasi momentum lanjut. Sering jadi candle "pemicu" breakout.

### Rising Three Methods (tiga metode naik)

Pola **5 candle** lanjutan tren naik:

![Rising Three Methods dan Falling Three Methods](/academy/candlestick-patterns/continuation.svg)

1. Candle **hijau besar**.
2-4. Tiga candle **kecil** (biasanya merah) yang **mengoreksi sebagian**, tapi tetap di dalam range candle pertama.
5. Candle **hijau besar baru** yang menutup di atas high candle pertama.

> Tiga candle kecil = "tarik napas" sejenak. Selama koreksi tidak menembus low candle pertama, tren naik dianggap masih sehat.

### Falling Three Methods (tiga metode turun)

Cermin dari Rising Three Methods, untuk tren turun:

1. Candle **merah besar**.
2-4. Tiga candle **kecil hijau** yang rebound sedikit tapi tetap di dalam range.
5. Candle **merah besar baru** yang menutup di bawah low candle pertama.

### Gap (celah)

**Gap** = celah harga antara candle: high satu candle lebih rendah dari low candle berikutnya (gap up), atau sebaliknya (gap down).

- **Gap up** searah tren naik → momentum beli kuat (sering karena berita/sentimen positif).
- **Gap down** searah tren turun → momentum jual kuat.
- Di IDX, gap sering muncul saat **pembukaan sesi** akibat berita semalam atau aksi korporasi.

> Hati-hati: tidak semua gap berlanjut. Ada **exhaustion gap** di akhir tren yang justru menandai pembalikan. Konfirmasi dengan volume & posisi tren.

### Tabel ringkas continuation

| Pola | Jumlah candle | Arah | Ciri kunci |
| --- | --- | --- | --- |
| Marubozu | 1 | sesuai warna | full body, tanpa wick |
| Rising Three Methods | 5 | bullish | hijau besar → 3 koreksi kecil → hijau besar |
| Falling Three Methods | 5 | bearish | merah besar → 3 rebound kecil → merah besar |
| Gap | antar candle | sesuai arah gap | celah harga |`,
    },

    // ===================== LESSON 6 =====================
    {
      slug: "cs-cara-pakai-dan-kesalahan",
      title: "Cara Pakai yang Benar: Konfirmasi, Lokasi & Kesalahan Umum",
      readMinutes: 8,
      summary:
        "Memvalidasi pola dengan volume, lokasi support/resistance, kesalahan umum pemula, dan disclaimer.",
      body: `## Cara Pakai Candlestick yang Benar

Mengenal 20+ pola tidak ada gunanya kalau kamu memakainya tanpa konteks. Pola candlestick adalah **sinyal probabilistik**, dan keandalannya melonjak saat dipadukan dengan tiga hal: **konfirmasi, lokasi, dan candle konfirmasi**.

### 1. Konfirmasi volume

Volume = "berapa banyak orang ikut serta" di balik sebuah candle.

- Pola reversal **lebih valid** jika candle pemicunya disertai **volume tinggi** (mis. Bullish Engulfing dengan volume besar = banyak pembeli benar-benar masuk).
- Pola dengan volume **tipis** sering jadi **sinyal palsu** — gerakan harga tanpa partisipasi nyata.
- Three White Soldiers / Three Black Crows paling meyakinkan saat volume **konsisten atau membesar**.

> Aturan praktis: **harga + volume harus sepakat**. Reversal tanpa lonjakan volume layak diragukan.

### 2. Lokasi (support / resistance)

Pola yang sama jauh lebih kuat di **lokasi penting**:

- **Reversal bullish di area support** (Hammer, Morning Star, Tweezer Bottom) → probabilitas tinggi.
- **Reversal bearish di area resistance** (Shooting Star, Evening Star, Tweezer Top) → probabilitas tinggi.
- Pola yang sama **di tengah-tengah** range, jauh dari S/R, jauh lebih lemah.

> "Pola bagus + lokasi bagus" jauh mengungguli "pola bagus + lokasi sembarangan".

### 3. Candle konfirmasi & timeframe

- Banyak pola (Hammer, Inverted Hammer, Doji) **butuh candle berikutnya** untuk konfirmasi arah. Jangan langsung masuk pada candle pola.
- **Timeframe lebih besar** (harian, mingguan) menghasilkan sinyal lebih andal daripada intraday yang penuh noise.

### Kesalahan umum (hindari!)

| Kesalahan | Akibat | Perbaikan |
| --- | --- | --- |
| Trading pola tanpa cek tren sebelumnya | Pola "reversal" tak punya arti | Pastikan ada tren yang dibalik |
| Abaikan volume | Masuk pada sinyal palsu | Tuntut konfirmasi volume |
| Abaikan support/resistance | Pola lemah di lokasi acak | Cari pola di S/R kunci |
| Masuk sebelum candle konfirmasi | Kena jebakan | Tunggu candle berikutnya |
| Pakai candlestick sendirian | Sinyal rapuh | Padukan tren, S/R, indikator |
| Over-trade di timeframe kecil | Banyak noise & sinyal palsu | Naik ke timeframe lebih besar |

### Karakter khas IDX

- Pola lebih andal di saham **likuid** (LQ45, IDX30). Saham tidur sering memberi pola palsu karena sedikit transaksi.
- Batas **ARA/ARB** bisa "memotong" body candle secara artifisial — jangan terlalu kaku menafsir panjang body saat harga menyentuh batas auto reject.
- **Saham gorengan** bisa membentuk pola "cantik" yang menyesatkan karena digerakkan bandar, bukan psikologi massa alami.

### Disclaimer penting

> Pola candlestick adalah **alat bantu membaca sentimen**, **bukan ramalan pasti**. Setiap pola hanya menggeser probabilitas, tidak menjamin arah. Jangan jadikan satu pola sebagai satu-satunya dasar beli/jual. Selalu gunakan **manajemen risiko** (stop loss, position sizing) dan jangan pertaruhkan dana yang tidak siap kamu rugikan.

### Penutup modul

Kamu sekarang mengenal lebih dari 20 pola candlestick: anatomi 1 candle, reversal bullish (Hammer, Inverted Hammer, Bullish Engulfing, Piercing Line, Morning Star, Three White Soldiers, Tweezer Bottom), reversal bearish (Hanging Man, Shooting Star, Bearish Engulfing, Dark Cloud Cover, Evening Star, Three Black Crows, Tweezer Top), pola keraguan (Doji & variannya, Spinning Top, Harami), dan continuation (Marubozu, Rising/Falling Three Methods, Gap). Latih mengenalinya langsung di chart saham likuid, selalu cek **volume + lokasi + tren**, dan perlakukan setiap sinyal sebagai probabilitas, bukan kepastian.`,
    },
  ],
};
