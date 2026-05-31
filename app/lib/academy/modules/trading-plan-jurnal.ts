// Modul Trading Plan & Jurnal — Academy Nubuat.
import type { AcademyModule } from "../content";

export const tradingPlanJurnalModule: AcademyModule = {
  slug: "trading-plan-jurnal",
  title: "Trading Plan & Jurnal",
  icon: "ClipboardList",
  level: "Pemula",
  description:
    "Fondasi disiplin yang sering dilewati: bikin rencana trading sistematis + jurnal evaluasi, supaya keputusan berbasis aturan, bukan emosi.",
  lessons: [
    {
      slug: "tp-kenapa-perlu",
      title: "Kenapa Wajib Punya Rencana",
      readMinutes: 5,
      summary: "Tanpa rencana, kamu trading pakai emosi — dan pasar menghukum itu.",
      body: `## "Failing to plan is planning to fail"

Mayoritas kerugian ritel bukan karena analisis jelek, tapi karena **tidak punya aturan** → keputusan diambil saat emosi memuncak (serakah waktu naik, panik waktu turun).

**Trading plan** = aturan main tertulis yang kamu buat saat **kepala dingin**, lalu ditaati saat pasar bergerak. Ia mengubah trading dari **judi** jadi **proses berulang yang bisa dievaluasi**.

## Apa yang dijawab trading plan?

1. **Apa** yang kamu trade-kan (saham seperti apa, sektor, kriteria).
2. **Kapan** masuk (setup & konfirmasi spesifik).
3. **Berapa** ukuran posisi (aturan risiko).
4. **Kapan** keluar (target & stop loss).
5. **Kapan TIDAK** trade (kondisi pasar buruk, tidak ada setup, lagi tidak fokus).

## Tanpa plan vs dengan plan

| Tanpa plan | Dengan plan |
|---|---|
| Beli karena "kayaknya naik" | Beli karena setup X terpenuhi |
| Hold rugi sambil berharap | Cut di stop yang sudah ditentukan |
| Sizing asal/all-in | Risiko terukur per trade |
| Tidak tahu kenapa menang/kalah | Bisa evaluasi & perbaiki |

> Plan tidak menjamin menang tiap trade. Ia menjamin kamu **konsisten & bisa belajar** — itu yang bikin cuan jangka panjang.

## Mulai sederhana

Tidak perlu rumit. Satu halaman cukup, asal **kamu taati**. Plan yang dijalankan > plan sempurna yang diabaikan.`,
    },
    {
      slug: "tp-bikin-plan",
      title: "Menyusun Trading Plan",
      readMinutes: 7,
      summary: "Komponen plan yang konkret + contoh template siap pakai.",
      body: `## Komponen trading plan

### 1. Tujuan & profil
- Target realistis (mis. tumbuhkan modal X% setahun — bukan "2x dalam sebulan").
- Gaya: investing / swing / day trade.
- Modal yang dialokasikan (uang dingin, bukan uang dapur/utang).

### 2. Kriteria seleksi saham
- Likuiditas minimal (value transaksi).
- Tren / fundamental minimal (mis. di atas MA50, ROE > X).
- Hindari: saham suspensi-prone, gorengan ARA-ARB liar.

### 3. Aturan entry
- Setup yang dipakai (pullback / breakout / dst) + konfirmasi.

### 4. Aturan risiko (paling penting)
- **Risiko per trade**: maks 1–2% modal.
- **Maks posisi terbuka** sekaligus.
- **Maks loss harian/mingguan** → stop kalau kena.

### 5. Aturan exit
- Stop loss (di mana & kenapa).
- Target / trailing.
- Partial profit?

### 6. Aturan "jangan trade"
- Saat tidak ada setup, pasar choppy, atau kamu lagi emosional/sakit/ngantuk.

## Contoh template (swing)

\`\`\`
TUJUAN: tumbuh 20-30%/tahun, gaya swing.
MODAL: Rp50jt (uang dingin).
SELEKSI: LQ45/likuid, harga > MA50, ada katalis/Verdict >= 6.
ENTRY: pullback ke support + candle reversal + Stoch keluar oversold.
RISIKO: maks 1.5%/trade, maks 4 posisi, stop harian -3%.
STOP: di bawah support ayunan. TARGET: resistance berikut (R:R >= 1:2).
EXIT TAMBAHAN: jual 1/2 di target 1, trail sisanya.
JANGAN TRADE: IHSG downtrend kuat, tidak ada setup, lagi panik.
\`\`\`

> Tempel plan ini di dekat layar. Sebelum tiap entry, cek: "Apakah trade ini sesuai plan?" Kalau tidak → jangan.`,
    },
    {
      slug: "tp-jurnal-evaluasi",
      title: "Jurnal Trading & Evaluasi",
      readMinutes: 6,
      summary: "Catat tiap trade, ukur metrik, dan perbaiki dari data — bukan perasaan.",
      body: `## Kenapa jurnal?

Tanpa catatan, kamu mengulang kesalahan yang sama tanpa sadar. **Jurnal** mengubah pengalaman jadi **pelajaran terukur**. Trader profesional hampir semua menjurnal.

## Apa yang dicatat per trade

- **Tanggal & emiten**.
- **Setup/alasan** masuk (screenshot chart kalau bisa).
- **Entry, stop, target** (rencana) vs **realisasi**.
- **Ukuran posisi & risiko rupiah**.
- **Hasil** (profit/loss, % , R multiple).
- **Emosi/kondisi** saat trade (tenang? FOMO? ngantuk?).
- **Pelajaran**: apa yang benar/salah, apakah ikut plan?

## Metrik yang dievaluasi (mingguan/bulanan)

- **Win rate** — % trade menang.
- **Average R:R realisasi** — rata-rata reward dibanding risk.
- **Expectancy** = (WinRate x AvgWin) − (LossRate x AvgLoss). Harus **positif**.
- **% trade yang ikut plan** — disiplin score. Idealnya mendekati 100%.
- **Penyebab loss terbesar** — pola berulang? (mis. selalu rugi di breakout palsu → kurangi setup itu).

> Insight kunci: kamu bisa **menang sering tapi tetap rugi** (kalau loss-nya besar-besar), atau **sering kalah tapi cuan** (kalau menangnya jauh lebih besar). Yang menentukan = **expectancy**, bukan win rate semata.

## Siklus perbaikan

1. **Trade** sesuai plan.
2. **Catat** di jurnal.
3. **Review** berkala → temukan pola.
4. **Perbaiki** plan (buang setup buruk, perkuat yang baik).
5. Ulangi.

## Praktik di Nubuat

- **Paper Trading** otomatis merekam riwayat transaksimu → jadikan basis jurnal awal tanpa risiko.
- **Backtest** untuk menguji apakah aturan baru lebih baik sebelum dipakai live.
- Catatan kualitatif (emosi, alasan) tetap kamu tulis sendiri — itu bagian paling berharga.

> Edukasi, bukan ajakan jual/beli. Disiplin mencatat & mengevaluasi adalah pembeda trader yang bertahan dari yang tumbang.`,
    },
  ],
};
