// Modul Saham FCA & Papan Pemantauan Khusus — Academy Nubuat.
import type { AcademyModule } from "../content";

export const sahamFcaModule: AcademyModule = {
  slug: "saham-fca-papan-khusus",
  title: "Saham FCA & Papan Khusus",
  icon: "AlertTriangle",
  level: "Menengah",
  description:
    "Memahami Papan Pemantauan Khusus & mekanisme Full Call Auction (FCA): kenapa harga gerak per sesi lelang, notasi khusus, risiko likuiditas, dan saham 'gocap'.",
  lessons: [
    {
      slug: "fca-papan-pemantauan",
      title: "Papan Pemantauan Khusus: Apa & Kenapa",
      readMinutes: 6,
      summary: "Tempat 'karantina' saham bermasalah — kenali kriteria & artinya buat investor.",
      body: `## Apa itu Papan Pemantauan Khusus?

**Papan Pemantauan Khusus** adalah papan terpisah di IDX tempat saham-saham yang memenuhi **kriteria tertentu** dipindahkan agar investor lebih waspada. Anggap saja "ruang observasi" — sahamnya masih bisa ditransaksikan, tapi dengan **mekanisme & peringatan khusus**.

## Kriteria masuk (antara lain)

Saham bisa masuk Papan Pemantauan Khusus jika, misalnya:
1. **Harga rata-rata < Rp51** (saham "gocap"/lapis bawah).
2. **Laporan keuangan** bermasalah (opini auditor tidak wajar / disclaimer).
3. **Likuiditas sangat rendah** (jarang ditransaksikan).
4. **Ekuitas negatif**, PKPU/pailit, going concern diragukan.
5. **Disuspensi** dalam waktu lama lalu dibuka kembali.
6. Volume/nilai transaksi terlalu kecil, atau kondisi khusus lain sesuai aturan bursa.

*(Daftar kriteria bisa berubah — selalu cek ketentuan IDX terbaru.)*

## Notasi khusus

Saham di papan ini diberi **notasi** (kode huruf) yang menjelaskan alasannya — mis. terkait opini auditor, ekuitas negatif, likuiditas, going concern, dsb. **Baca notasi ini** sebelum transaksi; itu ringkasan "kenapa saham ini diawasi".

## Artinya buat kamu

> Saham di Papan Pemantauan Khusus = **lampu kuning sampai merah**. Bukan otomatis "haram dibeli", tapi **risiko jauh lebih tinggi**: bisa tidak likuid, fundamental rapuh, atau dalam proses bermasalah. Untuk mayoritas investor, **hindari** kecuali kamu benar-benar paham risikonya.

Yang membedakan papan ini dari papan Utama/Pengembangan: ada mekanisme dagang khusus → **Full Call Auction (FCA)**, dibahas di lesson berikutnya.`,
    },
    {
      slug: "fca-mekanisme-lelang",
      title: "Full Call Auction (FCA): Cara Kerjanya",
      readMinutes: 7,
      summary: "Kenapa harga FCA cuma bergerak per sesi lelang, bukan terus-menerus.",
      body: `## Beda continuous auction vs call auction

Di papan biasa (**continuous auction**), transaksi terjadi **terus-menerus** sepanjang jam bursa — tiap bid ketemu offer langsung match.

Di **Full Call Auction (FCA)**, transaksi **TIDAK** terus-menerus. Order dikumpulkan dulu dalam periode tertentu, lalu di-match **serentak** di **beberapa sesi lelang (call)** pada waktu yang ditentukan. Harga ditentukan di titik yang memaksimalkan volume yang bisa match.

> Itu sebabnya di saham FCA, harga "diam" cukup lama lalu **loncat** saat sesi lelang. Kamu tidak bisa langsung "sikat offer" kapan saja seperti saham biasa.

## Implikasi praktis

1. **Eksekusi tidak instan** — order kamu antri sampai sesi lelang berikutnya. Mau cepat keluar? Belum tentu bisa.
2. **Harga per sesi** — pergerakan harga terjadi bertahap di titik-titik lelang, bukan tiap detik.
3. **Likuiditas bisa tipis** — kalau sedikit yang transaksi, order kamu bisa tidak ke-match sama sekali.
4. **Spread bisa lebar** — selisih harga beli-jual sering jauh.

## Tujuan FCA

Mekanisme ini dirancang untuk:
- **Meredam manipulasi** harga di saham tidak likuid / lapis bawah.
- Memberi **harga yang lebih "adil"** (ditentukan kolektif di lelang, bukan segelintir order beruntun).
- Melindungi investor dari volatilitas liar saham bermasalah.

> FCA bukan hukuman — ia perlindungan. Tapi konsekuensinya: saham jadi **lebih sulit diperdagangkan**. Kalau kamu masuk, sadari kamu mungkin **susah keluar** di harga yang kamu mau.`,
    },
    {
      slug: "fca-risiko-gocap",
      title: "Risiko 'Gocap', Likuiditas & Sikap Investor",
      readMinutes: 6,
      summary: "Jebakan saham gocap di papan khusus dan cara menyikapinya dengan waras.",
      body: `## Fenomena 'gocap' (Rp50)

Dulu batas bawah harga saham di pasar reguler adalah **Rp50** ("gocap") — saham yang turun ke situ "berhenti" & sering jadi **tidur** (tidak ada transaksi, nyangkut). Dengan Papan Pemantauan Khusus + FCA, saham di bawah Rp51 kini **bisa bergerak di bawah Rp50** lewat lelang → harga bisa turun lebih jauh (mendekati Rp1).

> Artinya: anggapan "gocap = aman, mentok di Rp50" **tidak berlaku lagi**. Saham gocap di papan khusus **masih bisa turun** ke Rp10, Rp5, bahkan Rp1. Jangan averaging down membabi buta dengan logika lama.

## Risiko utama saham FCA / papan khusus

1. **Likuiditas** — susah jual; bisa nyangkut tanpa pembeli.
2. **Fundamental rapuh** — banyak yang rugi kronis / ekuitas negatif.
3. **Delisting** — sebagian berakhir dikeluarkan dari bursa → nilai mendekati nol (lihat modul Studi Kasus).
4. **Harga turun lebih dalam** dari era gocap lama.

## Sikap investor yang waras

- **Mayoritas investor: hindari.** Risiko/return-nya tidak sepadan untuk pemula & investor biasa.
- Kalau tetap masuk (spekulasi sadar, mis. bertaruh turnaround):
  - **Uang sangat kecil** yang siap hilang total.
  - Pahami **notasi & laporan keuangannya** — apa katalis pemulihannya?
  - Sadari **eksekusi lambat** (FCA) — jangan harap cepat cair.
  - **Jangan** pakai utang / dana penting.

## Cara cek di Nubuat

- Lihat **notasi khusus** & status papan di info emiten.
- **Nubuat Verdict** (quality/value) untuk gambaran cepat kesehatan.
- Modul **Fundamental & Baca Laporan Keuangan** untuk membedah lebih dalam.

> Edukasi, bukan ajakan jual/beli. Saham papan khusus berisiko tinggi; banyak yang berakhir nyangkut atau delisting. Kelola risiko & jangan FOMO.`,
    },
  ],
};
