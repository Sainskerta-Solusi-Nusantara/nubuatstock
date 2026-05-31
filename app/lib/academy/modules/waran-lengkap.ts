// Modul Waran Lengkap — Academy Nubuat.
import type { AcademyModule } from "../content";

export const waranLengkapModule: AcademyModule = {
  slug: "waran-lengkap",
  title: "Waran & Structured Warrant",
  icon: "Ticket",
  level: "Menengah",
  description:
    "Perdalam waran: waran biasa (company warrant) vs structured warrant, cara hitung untung-rugi, time decay, leverage, dan risikonya yang sering disepelekan.",
  lessons: [
    {
      slug: "wr-dasar-waran",
      title: "Waran Biasa: Hak, Bukan Kewajiban",
      readMinutes: 6,
      summary: "Memahami waran company-issued: exercise price, jatuh tempo, dilusi.",
      body: `## Apa itu waran?

**Waran** = hak (bukan kewajiban) untuk **membeli saham** dari emiten di **harga pelaksanaan (exercise price)** tertentu, sampai **tanggal jatuh tempo**. Sering diberikan gratis sebagai "pemanis" saat IPO atau right issue. Kodenya berakhiran **-W** (mis. ABCD-W).

## Cara kerja (waran biasa / company warrant)

- Diterbitkan **oleh emiten** itu sendiri.
- Saat di-**exercise**, kamu **bayar exercise price** → dapat **saham baru** (perusahaan menerbitkan saham baru → ada **dilusi**).
- Punya **periode pelaksanaan** & **tanggal jatuh tempo**.

## Contoh

Waran ABCD-W: exercise price Rp100, jatuh tempo Des 2026.
- Harga saham ABCD sekarang Rp150 → waran "in the money": kamu bisa tebus di Rp100, saham nilainya Rp150 → untung kotor Rp50/lembar (sebelum biaya & harga beli waran).
- Harga saham Rp80 → "out of the money": buat apa tebus di Rp100 kalau di pasar Rp80? Waran tak bernilai untuk di-exercise.

## Nasib di jatuh tempo

- Harga saham **di atas** exercise → waran bernilai (exercise atau jual waran sebelum tempo).
- Harga saham **di bawah** exercise sampai jatuh tempo → **waran HANGUS, nilainya NOL**. Modal di waran hilang total.

> Risiko #1 waran: **bisa jadi nol** kalau saham tak naik melewati exercise price sebelum jatuh tempo. Beda dengan saham yang (selama tidak delisting) masih punya nilai.`,
    },
    {
      slug: "wr-structured-warrant",
      title: "Structured Warrant (Waran Terstruktur)",
      readMinutes: 7,
      summary: "Produk baru di IDX: diterbitkan sekuritas, ada call & put, tanpa dilusi.",
      body: `## Beda dengan waran biasa

**Structured Warrant (Waran Terstruktur)** adalah produk yang lebih baru di IDX. Bedanya mendasar:

| | Waran biasa | Structured Warrant |
|---|---|---|
| Penerbit | **Emiten** sahamnya | **Perusahaan sekuritas** (issuer) |
| Saat exercise | Saham **baru** (dilusi) | **Tunai/penyelesaian**, tanpa saham baru → **tidak ada dilusi** |
| Arah | Hanya "call" (naik) | Bisa **Call** (taruhan naik) **& Put** (taruhan turun) |
| Underlying | Saham itu sendiri | Saham acuan (mis. big caps) |

## Komponen penting

- **Underlying** — saham acuan (biasanya likuid/big cap).
- **Exercise/strike price** — harga acuan.
- **Ratio** — berapa waran setara 1 saham (mis. 10:1).
- **Expiry** — tanggal jatuh tempo.
- **Liquidity provider** — issuer wajib menyediakan kuotasi (agar bisa ditransaksikan).

## Call vs Put

- **Call warrant** — untung kalau underlying **naik** di atas strike.
- **Put warrant** — untung kalau underlying **turun** di bawah strike.

> Structured warrant membuat ritel bisa "taruhan dua arah" dengan modal lebih kecil — tapi ini **derivatif** dengan risiko tinggi. Bukan untuk pemula.`,
    },
    {
      slug: "wr-leverage-timedecay",
      title: "Leverage, Time Decay & Manajemen Risiko",
      readMinutes: 7,
      summary: "Kenapa waran bisa naik/turun jauh lebih kencang — dan habis dimakan waktu.",
      body: `## Leverage (daya ungkit)

Waran bergerak **jauh lebih kencang** dari sahamnya (persentase). Saham naik 5% → waran bisa naik 30-50% (atau sebaliknya). Karena harganya jauh lebih murah dari saham, **persentase perubahannya berlipat**.

> Leverage = pedang bermata dua. **Untung besar & rugi besar** sama mudahnya. Banyak ritel tergoda waran karena "murah", lalu kaget modal habis cepat.

![Payoff call warrant: rugi tetap (premi) di bawah exercise, untung naik setelah break-even, plus ilustrasi time decay menyusutkan nilai mendekati jatuh tempo](/academy/waran/payoff-timedecay.svg)

## Time decay (theta) — musuh diam-diam

Waran punya **tanggal jatuh tempo**. Makin dekat jatuh tempo, **nilai waktu (time value) menyusut** — disebut **time decay**. Bahkan kalau harga saham **diam**, harga waran bisa **turun terus** karena waktu berkurang.

> Inilah jebakan klasik: "saham gak turun kok, tapi waran saya merah terus?" → itu **time decay**. Waran bukan instrumen "hold lama"; ia melawan waktu.

## In/At/Out of the money

- **In the money (ITM)** — strike menguntungkan vs harga sekarang. Punya nilai intrinsik.
- **At the money (ATM)** — harga ≈ strike.
- **Out of the money (OTM)** — strike rugi vs harga sekarang. Hanya punya nilai waktu → paling rentan jadi nol.

## Manajemen risiko waran (wajib)

1. **Modal kecil** — alokasikan porsi sangat kecil; anggap bisa hilang total.
2. **Punya exit plan & cut loss** — leverage bikin loss cepat membesar.
3. **Perhatikan jatuh tempo** — jangan pegang OTM mendekati expiry (time decay brutal).
4. **Pahami ratio & strike** sebelum beli — hitung break-even.
5. **Bukan untuk averaging down** — kalau salah arah + waktu habis, averaging = bakar uang.

## Break-even (waran biasa, call)

\`\`\`
Break-even ≈ Exercise Price + Harga Beli Waran (disesuaikan ratio)
\`\`\`
Saham harus naik **melewati** break-even sebelum jatuh tempo supaya kamu untung — bukan sekadar di atas exercise price.

## Inti

> Waran & structured warrant cocok untuk yang **paham derivatif & sadar risiko** — bukan pemula mencari "saham murah". Leverage + time decay bisa menghapus modal dengan cepat. Mayoritas investor lebih baik fokus ke saham/ETF dulu.

Edukasi, bukan ajakan jual/beli. Derivatif berisiko tinggi; baca dokumen produk (term sheet) sebelum transaksi.`,
    },
  ],
};
