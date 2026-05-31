/**
 * Academy module: Pola Chart (Chart Patterns).
 *
 * Modul mendalam tentang pola grafik klasik analisis teknikal — dari konsep
 * dasar (reversal vs continuation, peran volume & konfirmasi), pola pembalikan
 * (Double Top/Bottom, Head & Shoulders), pola penerusan (Triangle, Flag,
 * Pennant), sampai Cup & Handle lengkap dengan cara entry/target/stop.
 *
 * Konten static & fully typed (sama dengan content.ts). Diagram dirender lewat
 * markdown image `![alt](/academy/patterns/NAMA.svg)` (SVG self-hosted di
 * public/academy/patterns/). Tidak ada raw HTML — LessonMarkdown hanya
 * mendukung markdown + remark-gfm.
 *
 * Di-wire ke ACADEMY_MODULES secara terpisah (lihat content.ts).
 */
import type { AcademyModule } from "../content";

export const chartPatternsModule: AcademyModule = {
  slug: "chart-patterns",
  title: "Pola Chart (Chart Patterns)",
  icon: "Triangle",
  level: "Menengah",
  description:
    "Pola grafik klasik dari nol sampai praktik: reversal vs continuation, peran volume, Double Top/Bottom, Head & Shoulders, Triangle, Flag & Pennant, sampai Cup & Handle — lengkap dengan diagram, cara entry/target/stop, dan kesalahan umum.",
  lessons: [
    // ===================== LESSON 1 =====================
    {
      slug: "cp-pengantar-pola-chart",
      title: "Pengantar Pola Chart",
      readMinutes: 7,
      summary:
        "Apa itu pola chart, beda reversal vs continuation, dan kenapa volume & konfirmasi wajib.",
      body: `## Pengantar Pola Chart

**Pola chart (chart patterns)** adalah bentuk berulang yang muncul di grafik harga karena perilaku pembeli & penjual cenderung mengulang dirinya. Sama seperti Elliott Wave, idenya: pergerakan harga bukan sepenuhnya acak — ia meninggalkan "jejak" psikologi pasar yang bisa kamu kenali dan manfaatkan.

Pola chart membantumu menjawab dua pertanyaan praktis:

1. **Ke mana arah harga berikutnya kemungkinan bergerak?**
2. **Di mana titik masuk (entry), target, dan stop yang logis?**

### Dua keluarga besar: Reversal vs Continuation

Semua pola klasik bisa dikelompokkan jadi dua keluarga utama.

![Perbandingan pola reversal yang membalik arah tren dengan pola continuation yang melanjutkan tren setelah jeda](/academy/patterns/reversal-vs-continuation.svg)

| Keluarga | Arti | Contoh pola |
| --- | --- | --- |
| **Reversal (pembalikan)** | Tren yang sedang berjalan **berbalik arah** | Double Top/Bottom, Head & Shoulders |
| **Continuation (penerusan)** | Tren **berhenti sejenak** lalu **lanjut** ke arah semula | Triangle, Flag, Pennant, Cup & Handle |

> Sebelum menebak pola, **kenali dulu tren yang berlaku**. Pola reversal hanya bermakna kalau ada tren yang bisa dibalik; pola continuation hanya bermakna sebagai jeda di dalam tren yang jelas.

### Anatomi umum setiap pola

Hampir semua pola punya komponen yang sama:

- **Garis kunci** — support, resistance, neckline, atau garis tren yang membentuk pola.
- **Titik breakout/breakdown** — saat harga menembus garis kunci, pola dianggap "aktif".
- **Target terukur (measured move)** — proyeksi jarak pergerakan setelah breakout, biasanya dihitung dari tinggi pola.
- **Invalidation** — titik di mana pola dianggap gagal (dasar untuk stop loss).

### Peran volume: bahan bakar pola

Volume adalah **konfirmator** paling penting untuk pola chart. Prinsipnya sederhana:

- **Volume mengecil** selama pola terbentuk (konsolidasi) → wajar; pasar sedang "menahan napas".
- **Volume melonjak saat breakout/breakdown** → konfirmasi kuat bahwa pergerakan didukung partisipasi luas.
- **Breakout tanpa volume** → waspada *false breakout* (jebakan); harga sering balik ke dalam pola.

> Pola tanpa konfirmasi volume seperti mobil tanpa bensin: bentuknya ada, tapi belum tentu jalan.

### Kenapa "konfirmasi" itu wajib

Pola yang **belum breakout** masih bisa gagal — bentuk yang sama bisa berakhir tanpa kelanjutan. Karena itu trader disiplin menunggu **konfirmasi**:

1. **Penutupan (close) di luar garis kunci**, bukan sekadar sundulan intraday.
2. **Volume mendukung** arah breakout.
3. Idealnya, **retest** garis yang ditembus berhasil bertahan sebagai support/resistance baru.

### Catatan jujur sejak awal

Pola chart bersifat **probabilistik & subjektif** — dua orang bisa "melihat" pola berbeda di chart yang sama, dan tidak semua pola berhasil. Pola paling andal di saham **likuid** dengan banyak partisipan. Anggap pola sebagai **peta kemungkinan + alat manajemen risiko**, bukan ramalan pasti. Di lesson-lesson berikut kita bedah pola satu per satu lengkap dengan diagram.`,
    },

    // ===================== LESSON 2 =====================
    {
      slug: "cp-double-top-bottom",
      title: "Double Top & Double Bottom",
      readMinutes: 8,
      summary:
        "Pola pembalikan 'M' dan 'W' — dua puncak/dasar kembar, neckline, dan target terukur.",
      body: `## Double Top & Double Bottom

Ini sepasang pola **reversal** paling populer dan mudah dikenali. Bentuknya seperti huruf **M** (Double Top) dan **W** (Double Bottom).

### Double Top (pembalikan turun — bentuk "M")

Muncul di **akhir tren naik**. Harga mencetak satu puncak, mundur ke sebuah lembah, naik lagi mencoba menembus puncak pertama, **tapi gagal** dan membentuk puncak kedua di area yang mirip. Kegagalan kedua ini menandai pembeli kehabisan tenaga.

![Pola Double Top berbentuk M: dua puncak sejajar, neckline support di lembah, lalu breakdown ke bawah](/academy/patterns/double-top.svg)

- **Dua puncak** di level harga yang relatif **sama** (toleransi beberapa persen).
- **Neckline** = garis support yang ditarik di **lembah** di antara kedua puncak.
- Pola **aktif** saat harga **menembus neckline ke bawah** (breakdown) — idealnya dengan volume membesar.

### Double Bottom (pembalikan naik — bentuk "W")

Kebalikannya, muncul di **akhir tren turun**. Harga mencetak dasar, memantul, turun lagi menguji dasar pertama, **tapi tidak menembusnya**, lalu berbalik naik. Penjual kehabisan tenaga.

![Pola Double Bottom berbentuk W: dua dasar sejajar, neckline resistance di puncak tengah, lalu breakout ke atas](/academy/patterns/double-bottom.svg)

- **Dua dasar** di level yang relatif **sama**.
- **Neckline** = garis resistance di **puncak** di antara kedua dasar.
- Pola **aktif** saat harga **menembus neckline ke atas** (breakout) dengan volume.

### Peran volume

- Pada Double Top, volume biasanya **lebih kecil di puncak kedua** dibanding puncak pertama → sinyal pembeli melemah.
- Pada Double Bottom, volume biasanya **lebih besar saat dasar kedua memantul** dan **melonjak saat breakout** → sinyal pembeli masuk.

### Target terukur (measured move)

Ukur **tinggi pola** (jarak vertikal dari neckline ke puncak/dasar), lalu proyeksikan dari titik breakout:

\`\`\`
Tinggi pola      = | level puncak/dasar − neckline |
Target Double Top    = neckline − tinggi pola   (ke bawah)
Target Double Bottom = neckline + tinggi pola   (ke atas)
\`\`\`

### Tabel ringkas

| Aspek | Double Top (M) | Double Bottom (W) |
| --- | --- | --- |
| Muncul di | Akhir uptrend | Akhir downtrend |
| Arah pembalikan | Turun (bearish) | Naik (bullish) |
| Neckline | Support (lembah) | Resistance (puncak) |
| Sinyal aktif | Tembus neckline ↓ | Tembus neckline ↑ |

> **Hati-hati:** sebelum neckline tertembus, "dua puncak/dasar" bisa saja hanya konsolidasi biasa. Jangan eksekusi sebelum **breakout/breakdown terkonfirmasi** dengan penutupan + volume.`,
    },

    // ===================== LESSON 3 =====================
    {
      slug: "cp-head-and-shoulders",
      title: "Head & Shoulders + Inverse",
      readMinutes: 9,
      summary:
        "Pola reversal paling andal: bahu-kepala-bahu, neckline, dan versi terbaliknya.",
      body: `## Head & Shoulders (Kepala & Bahu)

Banyak praktisi menganggap **Head & Shoulders (H&S)** sebagai salah satu pola pembalikan **paling andal**. Bentuknya: tiga puncak — puncak tengah (**kepala**) lebih tinggi dari dua puncak di sisinya (**bahu kiri** & **bahu kanan**).

![Pola Head and Shoulders: bahu kiri, kepala lebih tinggi, bahu kanan, dengan neckline yang ditarik di dua lembah lalu breakdown](/academy/patterns/head-shoulders.svg)

### Anatomi H&S (versi bearish)

Muncul di **akhir tren naik**:

1. **Bahu kiri** — puncak, lalu turun ke lembah.
2. **Kepala** — puncak yang **lebih tinggi**, lalu turun lagi (kira-kira ke level lembah sebelumnya).
3. **Bahu kanan** — puncak yang **lebih rendah** dari kepala (sering mirip tinggi bahu kiri) → pembeli gagal bikin high baru.
4. **Neckline** — garis yang menghubungkan **dua lembah** di antara puncak-puncak.

Pola **aktif** saat harga **menembus neckline ke bawah** (breakdown), idealnya dengan **volume melonjak**.

> Ciri volume klasik: volume **menurun** dari bahu kiri → kepala → bahu kanan (momentum melemah), lalu **melonjak saat breakdown**.

### Inverse Head & Shoulders (versi bullish)

Sama persis tapi **terbalik** — muncul di **akhir tren turun** dan menandai pembalikan **naik**:

- Tiga **dasar**: dasar kiri, dasar tengah yang **lebih dalam** (kepala terbalik), dasar kanan.
- **Neckline** ditarik di **dua puncak** di antaranya → kini berfungsi sebagai **resistance**.
- Pola aktif saat harga **menembus neckline ke atas** (breakout) dengan volume.

### Target terukur

Ukur jarak vertikal dari **puncak/dasar kepala ke neckline**, lalu proyeksikan dari titik breakout:

\`\`\`
Tinggi pola = | harga kepala − neckline (di bawah/atas kepala) |
Target H&S          = titik breakdown − tinggi pola   (ke bawah)
Target Inverse H&S  = titik breakout  + tinggi pola   (ke atas)
\`\`\`

### Catatan neckline yang miring

Neckline tidak selalu datar — bisa **miring naik atau turun**. Neckline yang miring **melawan arah breakout** (mis. neckline naik pada H&S bearish) cenderung memberi sinyal lebih kuat. Yang penting tetap: tunggu **penutupan** di luar neckline, bukan sekadar sundulan.

### Tabel ringkas

| Aspek | H&S | Inverse H&S |
| --- | --- | --- |
| Muncul di | Akhir uptrend | Akhir downtrend |
| Bentuk | 3 puncak (kepala tertinggi) | 3 dasar (kepala terdalam) |
| Neckline | Support | Resistance |
| Sinyal | Breakdown ↓ | Breakout ↑ |

> **Kesalahan umum:** menebak H&S terlalu dini saat bahu kanan belum jelas, atau eksekusi sebelum neckline tertembus. Sabar — pola ini baru valid setelah neckline ditembus dengan konfirmasi.`,
    },

    // ===================== LESSON 4 =====================
    {
      slug: "cp-triangle",
      title: "Triangle (Segitiga)",
      readMinutes: 8,
      summary:
        "Tiga jenis segitiga — ascending, descending, symmetrical — dan cara baca arah breakout.",
      body: `## Triangle (Segitiga)

**Triangle** adalah pola **konsolidasi** di mana rentang harga **menyempit** seiring waktu — pembeli & penjual makin seimbang sampai akhirnya satu sisi menang lewat breakout. Umumnya bersifat **continuation**, tapi bisa juga jadi reversal; arah pasti baru jelas saat breakout.

![Tiga jenis triangle: ascending dengan atap datar dan dasar naik, descending dengan dasar datar dan puncak turun, serta symmetrical yang menyempit dari dua sisi](/academy/patterns/triangles.svg)

### 1. Ascending Triangle (cenderung bullish)

- **Garis atas datar** (resistance yang berkali-kali diuji).
- **Garis bawah naik** (higher lows) — pembeli makin agresif menaikkan dasar.
- Bias **breakout ke atas**: tekanan beli mendorong harga menembus resistance datar.

### 2. Descending Triangle (cenderung bearish)

- **Garis bawah datar** (support yang berkali-kali diuji).
- **Garis atas turun** (lower highs) — penjual makin menekan.
- Bias **breakdown ke bawah**: tekanan jual menembus support datar.

### 3. Symmetrical Triangle (netral)

- **Kedua garis menyempit** ke arah satu titik (lower highs + higher lows).
- **Tidak punya bias arah** sendiri — biasanya **melanjutkan tren sebelumnya**, tapi tunggu breakout untuk memastikan.

### Peran volume

Volume khas **mengecil** saat segitiga menyempit (ketidakpastian), lalu **melonjak saat breakout**. Breakout symmetrical tanpa lonjakan volume rawan jadi *false breakout*.

### Target terukur

Ukur **tinggi segitiga** di bagian paling lebar (basis), lalu proyeksikan dari titik breakout:

\`\`\`
Tinggi segitiga = jarak vertikal di sisi terlebar pola
Target = titik breakout ± tinggi segitiga (searah breakout)
\`\`\`

### Tips & jebakan

- **Breakout paling andal** terjadi saat harga sudah mengisi **50–75%** panjang segitiga — bukan tepat di ujung (apex), di mana energi sudah habis.
- Waspada **false breakout** menjelang apex; konfirmasi dengan penutupan + volume.
- Pada symmetrical, jangan menebak arah duluan — **ikuti** breakout, jangan **mendahuluinya**.

### Tabel ringkas

| Jenis | Garis atas | Garis bawah | Bias |
| --- | --- | --- | --- |
| **Ascending** | Datar | Naik | Bullish ↑ |
| **Descending** | Turun | Datar | Bearish ↓ |
| **Symmetrical** | Turun | Naik | Ikut tren / netral |

> Anggap triangle sebagai **"per yang ditekan"**: makin lama makin sempit, lalu meletup ke arah breakout. Tugasmu menunggu letupan terkonfirmasi, bukan menebaknya.`,
    },

    // ===================== LESSON 5 =====================
    {
      slug: "cp-flag-pennant",
      title: "Flag & Pennant (Penerusan)",
      readMinutes: 7,
      summary:
        "Jeda singkat setelah pergerakan tajam: bendera & panji yang melanjutkan tren.",
      body: `## Flag & Pennant (Bendera & Panji)

**Flag** dan **Pennant** adalah pola **continuation jangka pendek** yang muncul setelah pergerakan harga **tajam & cepat**. Keduanya merepresentasikan **jeda singkat** (ambil napas / profit taking ringan) sebelum tren melanjutkan ke arah semula.

![Pola Flag berbentuk kanal kecil miring dan Pennant berbentuk segitiga mungil, keduanya didahului tiang tajam lalu breakout melanjutkan tren](/academy/patterns/flag-pennant.svg)

### Elemen bersama: tiang (flagpole)

Keduanya diawali **flagpole** — lonjakan tajam yang hampir lurus (sering disertai volume besar / berita). Pola lalu terbentuk sebagai **konsolidasi kecil** di ujung tiang.

### Flag (bendera)

- Berbentuk **kanal/persegi panjang kecil** yang **miring melawan arah tren** (bull flag miring sedikit turun; bear flag miring sedikit naik).
- Dibatasi **dua garis sejajar**.
- Breakout **searah tiang** menandai lanjutan tren.

### Pennant (panji)

- Berbentuk **segitiga simetris mungil** yang menyempit cepat — mirip symmetrical triangle tapi jauh lebih kecil & singkat.
- Breakout searah tiang.

### Perbedaan kunci Flag vs Pennant

| Aspek | Flag | Pennant |
| --- | --- | --- |
| Bentuk konsolidasi | Kanal sejajar (miring) | Segitiga menyempit |
| Garis batas | Dua garis **sejajar** | Dua garis **mengerucut** |
| Durasi | Singkat | Sangat singkat |
| Sifat | Continuation | Continuation |

### Peran volume

Pola sehat: volume **tinggi di tiang**, **mengering** selama konsolidasi (bendera/panji), lalu **melonjak lagi saat breakout**. Pola volume "tinggi–kering–tinggi" ini adalah ciri khas yang memperkuat keandalan.

### Target terukur

Khas pola ini: target = **panjang tiang** diproyeksikan dari titik breakout.

\`\`\`
Panjang tiang = jarak vertikal lonjakan awal (flagpole)
Target = titik breakout ± panjang tiang (searah tren)
\`\`\`

### Catatan praktis

- Flag/Pennant biasanya **berdurasi pendek** (beberapa hari sampai beberapa minggu). Konsolidasi yang **terlalu lama** atau **terlalu dalam** (mengoreksi lebih dari ~50% tiang) melemahkan validitas pola.
- Pola ini lebih reaktif → cocok untuk trader momentum, tapi tetap butuh **stop** karena breakout bisa gagal.

> Ingat: flag & pennant adalah **jeda**, bukan pembalikan. Bacanya searah tren yang sudah berjalan, bukan melawannya.`,
    },

    // ===================== LESSON 6 =====================
    {
      slug: "cp-cup-and-handle",
      title: "Cup & Handle + Praktik Entry/Target/Stop",
      readMinutes: 9,
      summary:
        "Pola 'cangkir bergagang', cara entry/target/stop, kesalahan umum, dan disclaimer.",
      body: `## Cup & Handle (Cangkir Bergagang)

**Cup & Handle** adalah pola **bullish continuation** yang dipopulerkan William O'Neil. Bentuknya seperti **cangkir** (dasar membulat seperti huruf "U") diikuti **gagang** (handle) — koreksi kecil sebelum breakout.

![Pola Cup and Handle: dasar membulat berbentuk U sebagai cup, lalu pullback kecil sebagai handle, diikuti breakout di atas rim dengan target sebesar kedalaman cup](/academy/patterns/cup-handle.svg)

### Anatomi pola

1. **Cup (cangkir)** — penurunan lalu pemulihan yang membentuk **dasar membulat "U"** (bukan "V" tajam). Dua bibir cangkir (rim) berada di level harga yang mirip.
2. **Rim / resistance** — garis horizontal di tepi atas cangkir; ini level **breakout**.
3. **Handle (gagang)** — setelah harga kembali ke rim, terjadi **pullback kecil** (konsolidasi/drift turun ringan) → "membuang" penjual lemah sebelum naik.
4. **Breakout** — harga menembus rim ke atas dengan **volume membesar**.

### Peran volume

- Volume **mengering** di dasar cangkir & selama handle (konsolidasi sehat).
- Volume **melonjak saat breakout** di atas rim → konfirmasi.

### Cara entry, target & stop (praktik)

Ini bagian terpenting — pola tanpa rencana eksekusi hanya gambar.

**Entry:**
- Konservatif: **setelah penutupan di atas rim** (breakout terkonfirmasi + volume).
- Agresif: di **akhir handle** saat pullback tampak selesai (risiko lebih tinggi, butuh konfirmasi cepat).

**Target (measured move):**

\`\`\`
Kedalaman cup = harga rim − dasar terendah cup
Target = harga breakout (rim) + kedalaman cup
\`\`\`

**Stop loss:**
- Letakkan **di bawah dasar handle** (atau di bawah swing low handle).
- Kalau harga balik ke dalam cangkir setelah breakout → pola gagal, hormati stop.

**Contoh angka:** rim di Rp1.000, dasar cup Rp800 → kedalaman Rp200. Setelah breakout di Rp1.000, target ≈ **Rp1.200**; stop di bawah dasar handle (mis. ~Rp960).

### Kesalahan umum (hindari!)

| Kesalahan | Akibat | Perbaikan |
| --- | --- | --- |
| Cup berbentuk "V" tajam | Dasar tidak matang, rapuh | Cari dasar membulat "U" |
| Handle terlalu dalam (> 1/3 cup) | Pola melemah | Handle sebaiknya dangkal |
| Entry sebelum breakout rim | Kena false move | Tunggu close di atas rim + volume |
| Abaikan volume | False breakout | Wajib lonjakan volume saat breakout |
| Tanpa stop | Kerugian membengkak | Selalu pasang stop di bawah handle |

### Pola continuation lain yang mirip

Cup & Handle adalah salah satu dari banyak pola continuation. Kalau sudah paham logikanya (konsolidasi → buang penjual lemah → breakout dengan volume → target = ukuran pola), kamu bisa membaca pola lain dengan kerangka yang sama.

### Penutup & disclaimer

Kamu sekarang paham fondasi pola chart: bedanya reversal vs continuation, peran volume & konfirmasi, plus pola-pola inti — Double Top/Bottom, Head & Shoulders + Inverse, Triangle, Flag & Pennant, dan Cup & Handle, lengkap dengan cara entry/target/stop.

> **Disclaimer penting:** pola chart adalah **alat bantu analisis, bukan kepastian**. Pola bersifat **probabilistik & subjektif** — tidak semua pola berhasil, dan *false breakout* itu nyata. Jangan jadikan satu pola sebagai satu-satunya dasar keputusan beli/jual. Selalu **padukan dengan konteks lain** (tren besar, support-resistance, volume, fundamental), gunakan **manajemen risiko** (stop loss + position sizing), dan jangan pertaruhkan dana yang tidak siap kamu rugikan. Pola paling andal di saham **likuid**; di saham gorengan, pola bisa menyesatkan karena harga digerakkan bandar, bukan psikologi massa yang natural.`,
    },
  ],
};
