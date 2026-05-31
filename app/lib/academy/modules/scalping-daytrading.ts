// Modul Scalping & Day Trading — Academy Nubuat.
import type { AcademyModule } from "../content";

export const scalpingDaytradingModule: AcademyModule = {
  slug: "scalping-day-trading",
  title: "Scalping & Day Trading",
  icon: "Zap",
  level: "Menengah",
  description:
    "Trading intraday: setup momentum cepat, manajemen risiko sangat ketat, biaya transaksi, dan psikologi tempo tinggi. Bukan untuk pemula.",
  lessons: [
    {
      slug: "sc-realita",
      title: "Realita Day Trading (Baca Dulu)",
      readMinutes: 6,
      summary: "Tempo tinggi, margin tipis, mayoritas rugi — kenali risikonya sebelum mulai.",
      body: `## Peringatan jujur

Day trading & scalping adalah gaya **paling sulit & berisiko**. Riset di berbagai pasar menunjukkan **mayoritas day trader ritel rugi** dalam jangka panjang. Ini bukan jalan cepat kaya — ini profesi penuh tekanan dengan margin tipis.

> Kalau kamu pemula, **kuasai swing trading dulu**. Day trading menuntut kecepatan, disiplin ekstrem, modal cukup, dan mental baja.

## Beda scalping vs day trading

- **Scalping** — ambil profit sangat kecil (beberapa tick/fraksi) berkali-kali, hold detik–menit.
- **Day trading** — buka-tutup posisi dalam **hari yang sama** (tidak menginap), hold menit–jam.

Keduanya **tidak overnight** → menghindari risiko gap pembukaan, tapi menukarnya dengan intensitas tinggi.

## Musuh utama: biaya transaksi

Tiap transaksi kena fee (±0,15% beli, ±0,25% jual). Scalping = banyak transaksi = **fee menumpuk**. Profit tipis bisa habis di fee.

> Hitung **break-even** dulu: dengan fee total ~0,4% bolak-balik, kamu butuh harga naik >0,4% cuma untuk balik modal. Target scalping harus realistis di atas itu.

## Syarat ikut day trading

1. **Saham likuid** — value transaksi besar, spread bid-offer sempit. Saham sepi = jebakan.
2. **Waktu & fokus** — harus pantau layar saat jam bursa.
3. **Modal memadai** — biar sizing wajar tanpa over-risk.
4. **Aturan risiko kaku** + kemampuan **cut loss instan** tanpa ragu.

Kalau salah satu tidak terpenuhi → day trading bukan untukmu (belum). Tidak apa-apa — swing/investing lebih ramah dan tetap profitable.`,
    },
    {
      slug: "sc-setup",
      title: "Setup Intraday & Eksekusi",
      readMinutes: 7,
      summary: "Momentum, breakout intraday, VWAP, dan disiplin cut loss cepat.",
      body: `## Setup intraday yang umum

1. **Momentum / gap-and-go** — saham yang dibuka kuat dengan volume & berita → ikuti momentum di awal sesi.
2. **Breakout intraday** — tembus high/low hari ini atau level konsolidasi intraday dengan volume.
3. **VWAP bounce** — VWAP (Volume Weighted Average Price) jadi "magnet" intraday; harga di atas VWAP = bias bullish, pantulan dari VWAP sering jadi entry.
4. **Pullback ke MA cepat** (mis. EMA 9/20 di timeframe menit) dalam tren intraday.

## Indikator tempo cepat

- **Volume** — nyawa day trading. No volume, no trade.
- **VWAP** — acuan harga "wajar" intraday institusi.
- **EMA cepat** (9/20) — arah momentum jangka sangat pendek.
- **Order book & running trade** — baca tekanan real-time (lihat modul Analisis Transaksi).

## Eksekusi & disiplin

- **Cut loss INSTAN** saat setup gagal — di intraday, ragu sedetik = rugi membesar. Stop loss ketat & non-negotiable.
- **Target kecil tapi konsisten** — jangan serakah; ambil profit sesuai rencana.
- **Batasi jumlah trade/hari** — overtrading = fee + emosi naik. Kualitas > kuantitas.
- **Stop trading setelah X loss beruntun** — "circuit breaker" pribadi biar tidak balas dendam (revenge trading).

## Manajemen risiko intraday

- Risiko per trade lebih kecil (mis. 0,5–1%) karena frekuensi tinggi.
- **Daily max loss** — kalau rugi sudah mencapai batas harian (mis. 2–3% modal), **berhenti hari itu**. Lindungi modal & mental.

> Konsistensi day trader bukan dari "menang besar", tapi dari **rugi kecil & terkendali** + menang yang sedikit lebih sering/lebih besar. Bertahan dulu, baru cuan.`,
    },
    {
      slug: "sc-psikologi-biaya",
      title: "Psikologi Tempo Tinggi & Kapan Berhenti",
      readMinutes: 6,
      summary: "Kelola emosi di tekanan tinggi + evaluasi apakah day trading layak buatmu.",
      body: `## Tekanan psikologis day trading

Keputusan cepat + uang nyata + layar berkedip = ladang emosi:
- **FOMO** — loncat ke saham yang sudah lari, kena puncak.
- **Revenge trading** — balas dendam setelah loss, makin dalam.
- **Overconfidence** — habis beberapa menang, sizing diperbesar, lalu satu loss besar menghapus semua.
- **Analysis paralysis** — terlalu banyak indikator, telat eksekusi.

### Penangkalnya

- **Aturan tertulis** yang tidak boleh dilanggar (entry, stop, max loss harian, max trade).
- **Jurnal trading** — catat tiap trade + alasan + emosi. Evaluasi mingguan (lihat modul Trading Plan & Jurnal).
- **Rutinitas** — jam fokus tetap, jeda istirahat, jauhi layar setelah daily max loss.

## Kapan berhenti / mundur

Jujur evaluasi setelah beberapa bulan + jurnal:
- Apakah **konsisten profit setelah fee** (bukan cuma sesekali hoki)?
- Apakah trading mengganggu kesehatan/pekerjaan/tidur?
- Apakah kamu menikmati prosesnya, atau cuma mengejar adrenalin?

Kalau jawabannya negatif → **tidak apa-apa mundur** ke swing/investing. Banyak orang lebih cuan & lebih waras dengan timeframe lebih panjang. Mengakui ini = kedewasaan, bukan kekalahan.

## Praktik di Nubuat

- **Paper Trading** WAJIB dulu — buktikan profitable di simulasi minimal beberapa bulan sebelum uang nyata.
- **Backtest** ide setup di data historis.
- Pakai **Alerts** untuk level kunci biar tak perlu melototin semua saham.

> Edukasi, bukan ajakan jual/beli. Day trading berisiko tinggi & mayoritas pelaku rugi. Jangan pakai uang yang tidak siap hilang, dan jangan pakai utang.`,
    },
  ],
};
