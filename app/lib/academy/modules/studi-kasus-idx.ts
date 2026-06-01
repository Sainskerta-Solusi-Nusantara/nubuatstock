// Modul Studi Kasus Saham IDX — Academy Nubuat.
// Pelajaran dari pola berulang di pasar (generik & edukatif, bukan tuduhan ke emiten tertentu).
import type { AcademyModule } from "../content";

export const studiKasusIdxModule: AcademyModule = {
  slug: "studi-kasus-idx",
  title: "Studi Kasus Saham IDX",
  icon: "Lightbulb",
  level: "Menengah",
  description:
    "Belajar dari pola berulang di pasar Indonesia: gorengan/pom-pom, suspensi & delisting, dan turnaround — supaya tidak terjebak pola yang sama.",
  lessons: [
    {
      slug: "sk-gorengan-pompom",
      title: "Anatomi Saham 'Gorengan' & Pom-Pom",
      readMinutes: 7,
      summary: "Ciri saham yang digoreng, mekanisme pom-pom, dan cara tidak jadi korban.",
      body: `## Apa itu 'gorengan'?

**Saham gorengan** = saham yang harganya digerakkan **bukan oleh fundamental**, melainkan oleh segelintir pihak ("bandar") yang menggoreng harga naik liar lalu menjual ke ritel di puncak (**pump and dump**).

> Catatan: ini pembahasan **pola generik & edukatif**, bukan tuduhan ke emiten tertentu. Tujuannya melatih kamu mengenali ciri-cirinya.

## Ciri khas (lampu merah)

1. **ARA beruntun** tanpa berita/kinerja yang masuk akal.
2. **Fundamental lemah** — rugi terus, ekuitas tipis, bisnis tidak jelas — tapi harga terbang.
3. **Float kecil** — saham publik sedikit → gampang digerakkan dana relatif kecil.
4. **Volume tiba-tiba meledak** dari sebelumnya sepi.
5. **Didorong "info orang dalam"** di grup/medsos: "pasti naik, masuk sekarang!"
6. **Broker tertentu mendominasi** transaksi (lihat modul Analisis Transaksi).

![Anatomi pump and dump: akumulasi diam-diam, markup ARA dengan pom-pom, distribusi ke ritel di puncak, markdown ARB](/academy/studi-kasus/pump-dump.svg)

## Mekanisme pom-pom

1. **Akumulasi diam-diam** di harga bawah.
2. **Pom-pom** — sebar narasi/hype (grup Telegram, influencer, "rumor akuisisi").
3. **Markup** — harga didorong ARA, ritel FOMO masuk.
4. **Distribusi** — bandar jual ke ritel yang baru masuk.
5. **Markdown** — harga ambruk ARB beruntun, ritel nyangkut di puncak.

## Cara tidak jadi korban

- **Cek fundamental** sebelum tergiur (modul Fundamental + Nubuat Verdict).
- **Curigai kenaikan parabolik** tanpa sebab jelas — yang naik tercepat sering jatuh terdalam.
- **Jangan percaya "untung pasti"** dari grup/influencer. Mereka sering sudah punya barang di bawah.
- Kalau tetap mau ikut (spekulasi sadar) → **uang kecil, stop loss ketat, jangan averaging down**. Sadari kamu mungkin jadi exit liquidity.

> Aturan sederhana: kalau kamu tidak paham KENAPA naik, dan satu-satunya alasan "kata orang", itu bukan investasi — itu lotre.`,
    },
    {
      slug: "sk-suspensi-delisting",
      title: "Suspensi, UMA & Delisting",
      readMinutes: 6,
      summary: "Saat saham 'dibekukan' atau dikeluarkan dari bursa — risiko nyata yang sering diabaikan.",
      body: `## UMA (Unusual Market Activity)

Bursa memberi tanda **UMA** saat ada aktivitas tidak wajar (harga/volume di luar kebiasaan). Ini **peringatan** ke investor agar berhati-hati & mencermati — sering muncul di saham yang sedang "panas"/digoreng.

> UMA bukan vonis, tapi **lampu kuning**. Banyak saham yang kena UMA tak lama kemudian ambruk. Jangan masuk hanya karena "lagi ramai".

![Eskalasi lampu bahaya: UMA, suspensi, papan khusus, sampai delisting](/academy/studi-kasus/uma-timeline.svg)

## Suspensi (penghentian sementara)

Bursa bisa **men-suspend** (membekukan perdagangan) saham karena:
- Kenaikan/penurunan harga ekstrem (cooling down).
- Belum menyampaikan laporan keuangan.
- Masalah hukum / going concern (kelangsungan usaha) diragukan.
- Menunggu keterbukaan informasi material.

**Efek ke kamu:** selama disuspend, **kamu tidak bisa jual** — dana nyangkut tanpa bisa keluar, kadang berbulan-bulan/bertahun. Ini risiko likuiditas yang nyata.

## Delisting (dikeluarkan dari bursa)

**Delisting** = saham dikeluarkan dari papan bursa. Bisa:
- **Sukarela** (go private) — biasanya ada buyback di harga tertentu.
- **Paksa (forced delisting)** — karena suspensi berkepanjangan / pailit / tidak penuhi syarat.

**Pada forced delisting**, saham jadi **sangat sulit dijual** (pindah ke pasar negosiasi/tidak likuid) dan nilainya bisa mendekati **nol**. Ini skenario terburuk: modal nyaris hangus.

## Cara melindungi diri

1. **Hindari emiten** dengan tanda bahaya going concern (rugi kronis, ekuitas negatif, opini auditor "disclaimer/adverse").
2. **Perhatikan UMA & notasi khusus** di kode saham (mis. tanda dari bursa soal kondisi tertentu).
3. **Diversifikasi** — jangan taruh porsi besar di satu saham berisiko.
4. **Pantau laporan keuangan** rutin (modul Fundamental & Baca Laporan Keuangan).

> Suspensi & delisting jarang datang tanpa peringatan. Tanda-tandanya biasanya sudah ada di laporan keuangan & notasi bursa — tugas kamu membacanya.`,
    },
    {
      slug: "sk-turnaround-pelajaran",
      title: "Turnaround & Pelajaran Investasi",
      readMinutes: 6,
      summary: "Kapan perusahaan bermasalah benar berbalik vs jebakan 'value trap'.",
      body: `## Turnaround — bangkit dari keterpurukan

**Turnaround** = perusahaan yang tadinya bermasalah (rugi, utang berat) berhasil **berbalik** jadi sehat & untung. Kalau ketebak lebih awal, returnnya bisa besar — tapi **risikonya juga besar** (banyak yang gagal bangkit).

## Turnaround asli vs value trap

| Turnaround asli | Value trap |
|---|---|
| Ada **katalis nyata** (manajemen baru, restrukturisasi utang berhasil, bisnis inti membaik) | "Murah" tapi bisnis terus menyusut |
| Arus kas operasi mulai positif | Bakar kas terus |
| Utang dikelola/turun | Utang menumpuk |
| Tren rugi mengecil → laba | Rugi konsisten, alasan selalu "tahun depan" |

> **Value trap** = saham kelihatan murah (PER/PBV rendah) tapi murahnya **wajar** karena bisnisnya memang memburuk. "Murah" bukan alasan beli kalau nilainya terus turun.

## Checklist menilai turnaround

1. **Apa katalisnya?** Spesifik & kredibel, bukan harapan.
2. **Arus kas operasi** sudah membaik (bukan cuma laba akuntansi dari pos sekali-untung).
3. **Neraca** — utang terkendali, tidak akan dilusi besar lewat right issue darurat.
4. **Manajemen** — track record & rencana jelas.
5. **Margin of safety** cukup (modul Valuasi) — karena ketidakpastian tinggi.

## Pelajaran besar dari sejarah IDX

1. **Fundamental menang jangka panjang** — hype memudar, kinerja bertahan.
2. **Yang naik tanpa alasan, turun tanpa ampun** — waspada parabolik.
3. **Likuiditas itu nyawa** — saham bisa "di atas kertas" untung tapi tak bisa dijual.
4. **Diversifikasi & sizing** menyelamatkan dari satu kesalahan fatal.
5. **Baca laporan keuangan & notasi bursa** — tanda bahaya hampir selalu ada lebih dulu.

## Praktik di Nubuat

- **Nubuat Verdict** (quality, value, growth) untuk saring cepat.
- **Compare** untuk menilai turnaround vs peers.
- **Academy Fundamental & Valuasi** untuk membedah laporan keuangannya.

> Edukasi, bukan ajakan jual/beli. Studi kasus melatih pengenalan pola; tiap emiten tetap perlu analisis sendiri & manajemen risiko.`,
    },
  ],
};
