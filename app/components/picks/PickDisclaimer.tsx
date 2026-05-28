import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/**
 * PickDisclaimer — caveat / disclaimer POJK 5/2024 untuk Daily Picks.
 *
 * Daily Picks menampilkan level SR/SL/TP konkret, jadi WAJIB ada disclaimer
 * "bukan rekomendasi jual/beli" di setiap surface (card, list, detail).
 *
 * Varian:
 * - `card`   → caveat ringkas di footer kartu (muted, text-xs).
 * - `banner` → kotak peringatan di header halaman.
 * - `footer` → catatan kaki halaman (muted).
 *
 * `text` opsional dari config `app.disclaimer_text`; kalau kosong dipakai
 * fallback hardcoded supaya disclaimer tidak pernah hilang.
 */

/** Caveat ringkas wajib di setiap card/level trading. */
export const PICK_CAVEAT_SHORT =
  "Bukan rekomendasi jual/beli. Ide trading hasil analisis algoritmik; segala risiko investasi ditanggung sendiri.";

/** Fallback panjang kalau config `app.disclaimer_text` kosong. */
export const PICK_DISCLAIMER_FALLBACK =
  "Seluruh analisis dan level trading (entry/SL/TP) di Daily Picks dihasilkan secara algoritmik untuk tujuan edukasi & informasi, bukan ajakan untuk membeli atau menjual efek. Keputusan dan risiko investasi sepenuhnya tanggung jawab pribadi. Kinerja masa lalu bukan jaminan kinerja masa depan. (Sesuai POJK 5/2024)";

interface PickDisclaimerProps {
  variant?: "card" | "banner" | "footer";
  /** Teks dari config `app.disclaimer_text`. Kosong → pakai fallback. */
  text?: string;
  className?: string;
  /** Tampilkan link "Selengkapnya" ke halaman disclaimer penuh. */
  withLink?: boolean;
}

export function PickDisclaimer({
  variant = "footer",
  text,
  className,
  withLink = false,
}: PickDisclaimerProps) {
  if (variant === "card") {
    return (
      <p
        className={cn(
          "border-t pt-2 text-[10px] leading-snug text-muted-foreground",
          className,
        )}
      >
        {PICK_CAVEAT_SHORT}
      </p>
    );
  }

  const body = text && text.trim().length > 0 ? text : PICK_DISCLAIMER_FALLBACK;

  if (variant === "banner") {
    return (
      <p
        className={cn(
          "rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs leading-relaxed text-yellow-900 dark:text-yellow-100",
          className,
        )}
      >
        <strong>Disclaimer:</strong> {body}{" "}
        {withLink ? (
          <Link href="/disclaimer" className="underline">
            Selengkapnya
          </Link>
        ) : null}
      </p>
    );
  }

  // footer
  return (
    <p
      className={cn(
        "text-[11px] leading-relaxed text-muted-foreground",
        className,
      )}
    >
      {body}{" "}
      {withLink ? (
        <Link href="/disclaimer" className="underline">
          Selengkapnya
        </Link>
      ) : null}
    </p>
  );
}
