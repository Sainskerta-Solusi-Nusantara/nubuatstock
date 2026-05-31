// Modul Valuasi Saham Mendalam — Academy Nubuat.
import type { AcademyModule } from "../content";

export const valuasiMendalamModule: AcademyModule = {
  slug: "valuasi-saham-mendalam",
  title: "Valuasi Saham Mendalam",
  icon: "Calculator",
  level: "Menengah",
  description:
    "Lanjutan Fundamental: cara menaksir nilai wajar saham — relative valuation (PER/PBV/EV-EBITDA), DCF sederhana, dan margin of safety.",
  lessons: [
    {
      slug: "vl-harga-vs-nilai",
      title: "Harga ≠ Nilai",
      readMinutes: 6,
      summary: "Konsep inti value investing: bedakan harga pasar dengan nilai wajar (intrinsik).",
      body: `## "Price is what you pay, value is what you get"

**Harga (price)** = angka di layar, ditentukan tarik-menarik supply-demand, sering dipengaruhi emosi pasar. **Nilai (value/intrinsic)** = berapa perusahaan itu *sebenarnya* layak dihargai berdasarkan kemampuannya menghasilkan uang.

Tujuan valuasi: menaksir **nilai wajar**, lalu bandingkan dengan harga.
- Harga **jauh di bawah** nilai wajar → potensi **undervalued** (menarik).
- Harga **jauh di atas** → **overvalued** (mahal/berisiko).

> Valuasi itu **seni + sains** — hasilnya RENTANG perkiraan, bukan angka pasti. Dua analis bisa beda. Yang penting prosesnya logis & asumsinya masuk akal.

## Dua mazhab valuasi

1. **Relative valuation** — bandingkan rasio (PER, PBV, EV/EBITDA) dengan emiten sejenis / rata-rata historis. Cepat, praktis.
2. **Absolute valuation (DCF)** — hitung nilai dari proyeksi arus kas masa depan, di-diskon ke nilai sekarang. Lebih dalam, banyak asumsi.

Investor sering pakai keduanya untuk cross-check.

## Sebelum valuasi: pahami bisnisnya

Valuasi tanpa paham bisnis = sampah masuk, sampah keluar. Kuasai dulu modul **Fundamental** (baca laporan keuangan) sebelum lanjut. Valuasi cuma menerjemahkan pemahaman bisnis jadi angka.`,
    },
    {
      slug: "vl-relative-valuation",
      title: "Relative Valuation: PER, PBV, EV/EBITDA",
      readMinutes: 8,
      summary: "Cara pakai rasio untuk menilai mahal/murah secara relatif — dan jebakannya.",
      body: `## PER (Price to Earnings Ratio)

\`\`\`
PER = Harga per Saham / Laba per Saham (EPS)
\`\`\`

Artinya: berapa rupiah kamu bayar untuk tiap Rp1 laba. PER 10 = "balik modal" dari laba ~10 tahun (asumsi laba tetap).

- Bandingkan dengan **emiten sejenis** & **rata-rata historis** emiten itu.
- PER rendah **belum tentu murah** — bisa karena laba lagi tinggi sesaat (siklikal di puncak) atau prospek suram (**value trap**).
- PER tinggi **belum tentu mahal** — pasar membayar premi untuk **pertumbuhan** tinggi.

> **PEG** = PER / pertumbuhan laba (%). PEG < 1 sering dianggap wajar untuk saham bertumbuh. Membantu menilai PER tinggi yang ditopang growth.

![Harga vs nilai wajar: harga pasar di bawah nilai wajar memberi margin of safety](/academy/valuasi/per-pbv.svg)

## PBV (Price to Book Value)

\`\`\`
PBV = Harga per Saham / Nilai Buku per Saham
\`\`\`

Berapa kali kamu bayar dibanding ekuitas bersih. Cocok untuk **bank & sektor aset-berat**. PBV < 1 = dihargai di bawah nilai buku (bisa murah, bisa ada masalah). Pasangkan dengan **ROE**: PBV wajar naik kalau ROE tinggi.

## EV/EBITDA

\`\`\`
EV (Enterprise Value) = Market Cap + Utang Bersih
EV/EBITDA = EV / EBITDA
\`\`\`

Lebih "apple-to-apple" antar perusahaan dengan struktur utang berbeda (mengabaikan efek pendanaan & pajak). Sering dipakai untuk emiten padat modal (telco, energi, infrastruktur).

## Jebakan relative valuation

- **Bandingkan yang sebanding** — bank vs bank, bukan bank vs teknologi.
- **Cek kualitas laba** — laba dari pos sekali-untung (jual aset) bikin PER menyesatkan.
- **Konteks siklus** — emiten komoditas: PER rendah di puncak siklus = sinyal bahaya, bukan murah.`,
    },
    {
      slug: "vl-dcf-margin-of-safety",
      title: "DCF Sederhana & Margin of Safety",
      readMinutes: 8,
      summary: "Logika menilai dari arus kas masa depan + bantalan pengaman untuk salah taksir.",
      body: `## Ide dasar DCF (Discounted Cash Flow)

Nilai perusahaan = **total arus kas masa depan**, tapi **di-diskon** ke nilai sekarang (uang Rp1 tahun depan < Rp1 hari ini).

Langkah konsep:
1. **Proyeksikan arus kas bebas (FCF)** beberapa tahun ke depan (mis. 5 tahun) dari asumsi pertumbuhan.
2. **Diskon** tiap tahun dengan tingkat diskonto (discount rate, mis. 10–12%) → nilai sekarang.
3. Tambahkan **terminal value** (nilai bisnis setelah periode proyeksi).
4. Jumlahkan → nilai perusahaan → bagi jumlah saham → **nilai wajar per saham**.

## Kenapa DCF harus dianggap "perkiraan kasar"

DCF **sangat sensitif** terhadap asumsi: ubah sedikit growth atau discount rate, hasilnya melompat jauh. Maka:
- Pakai asumsi **konservatif**.
- Buat **skenario** (pesimis / basis / optimis), bukan satu angka.
- DCF terbaik untuk bisnis yang **arus kasnya stabil & bisa diprediksi** (konsumer, utilitas). Susah untuk yang siklikal/awal-tumbuh.

## Margin of Safety (MoS)

Inti ajaran Benjamin Graham: **beli jauh di bawah taksiran nilai wajar** sebagai bantalan kalau taksiranmu salah.

\`\`\`
Margin of Safety = (Nilai Wajar − Harga) / Nilai Wajar
\`\`\`

Contoh: nilai wajar Rp1.000, harga Rp700 → MoS 30%. Banyak value investor minta MoS **20–50%** sebelum masuk.

> MoS = pengakuan rendah hati bahwa **kamu bisa salah**. Ia melindungi dari kesalahan asumsi, ketidakpastian, dan nasib buruk.

## Alur praktis di Nubuat

1. Pahami bisnis (modul Fundamental) → baca laporan keuangan.
2. Relative valuation (PER/PBV/EV-EBITDA) vs peers & histori.
3. (Opsional) DCF sederhana untuk cross-check, pakai skenario konservatif.
4. Tentukan nilai wajar = RENTANG, lalu minta **margin of safety** sebelum beli.
5. Cek **Nubuat Verdict** (faktor value & quality) sebagai pembanding.

> Edukasi, bukan saran investasi. Valuasi mengurangi risiko, bukan menghapusnya — tetap diversifikasi & kelola risiko.`,
    },
  ],
};
