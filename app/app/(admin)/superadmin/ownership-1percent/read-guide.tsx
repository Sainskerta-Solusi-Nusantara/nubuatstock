"use client";

import * as React from "react";
import { HelpCircle, ExternalLink, X } from "lucide-react";

/**
 * Panduan inline "cara membaca data kepemilikan ≥1% (KSEI)".
 *
 * Sengaja ditaruh langsung di halaman (bukan di Guidance umum) karena data ini
 * membingungkan dan user butuh arahan seketika. Tombol pemicu + panel ringkas,
 * plus opsi redirect ke sumber/dokumen eksternal.
 */

/** Link eksternal "selengkapnya" — sumber resmi KSEI. */
const EXTERNAL_GUIDE_URL = "https://www.ksei.co.id/data/graph/composition";

export function OwnershipReadGuide() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
      >
        <HelpCircle className="h-4 w-4" /> Cara baca data ≥1%
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="my-8 w-full max-w-2xl rounded-lg border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold">Cara baca data Kepemilikan ≥1%</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm leading-relaxed">
              <p className="text-muted-foreground">
                Data ini menampilkan <strong className="text-foreground">pemegang saham yang memiliki ≥1%</strong>{" "}
                dari sebuah emiten (aturan pelaporan KSEI). Pemegang &lt;1% tidak terdaftar satu per satu —
                makanya total ≥1% sering tidak mencapai 100%.
              </p>

              <Section title="Istilah dasar">
                <ul className="ml-4 list-disc space-y-1">
                  <li><strong>Lokal (D)</strong> vs <strong>Asing (F)</strong> — domisili/jenis pemegang.</li>
                  <li><strong>Free float</strong> — porsi saham beredar bebas (di luar pengendali).</li>
                  <li><strong>Holder ≥1%</strong> — jumlah pihak yang masing-masing punya ≥1%.</li>
                </ul>
              </Section>

              <Section title="Metrik konsentrasi (tab Metrik)">
                <ul className="ml-4 list-disc space-y-1">
                  <li><strong>CR1</strong> — % pemegang terbesar. Makin tinggi = makin terkonsentrasi di 1 tangan.</li>
                  <li><strong>CR3</strong> — gabungan 3 pemegang terbesar.</li>
                  <li><strong>HHI</strong> — indeks konsentrasi (Herfindahl). Tinggi = kepemilikan terpusat; rendah = tersebar.</li>
                </ul>
              </Section>

              <Section title="Tab yang tersedia">
                <ul className="ml-4 list-disc space-y-1">
                  <li><strong>Ringkasan / Per Investor / Konglo</strong> — lihat per emiten, per investor, dan grup konglomerat.</li>
                  <li><strong>Klasifikasi</strong> — komposisi <strong>9 tipe investor KSEI</strong> (BalancePos), mencakup 100% saham.</li>
                  <li><strong>Perubahan Data</strong> — apa yang berubah antar dua periode (pilih periode di dropdown).</li>
                  <li><strong>Validasi</strong> — cek kecocokan data ≥1% terhadap KSEI resmi.</li>
                </ul>
              </Section>

              <Section title="9 tipe investor KSEI (tab Klasifikasi)">
                <p className="text-muted-foreground">
                  IS=Asuransi · CP=Korporasi · PF=Dana Pensiun · IB=Bank/Inst. Keuangan · ID=Individu ·
                  MF=Reksa Dana · SC=Sekuritas · FD=Yayasan · OT=Lainnya. Dipisah Lokal vs Asing.
                </p>
              </Section>

              <div className="rounded-md bg-muted/40 p-3 text-[12px] text-muted-foreground">
                <strong>Catatan:</strong> komposisi 9-tipe diambil langsung dari KSEI (resmi). Daftar nama ≥1%
                bersifat indikatif — klasifikasi &ldquo;asing&rdquo; bisa berbeda dengan KSEI (pemilik manfaat
                vs domisili akun). Lihat tab <strong>Validasi</strong> untuk tingkat kecocokannya.
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
              <a
                href={EXTERNAL_GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Buka sumber KSEI <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => setOpen(false)}
                className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
