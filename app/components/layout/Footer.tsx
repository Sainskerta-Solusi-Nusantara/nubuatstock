import Link from "next/link";

export function Footer() {
  return (
    <footer className="hidden border-t bg-background/60 px-6 py-4 text-xs text-muted-foreground md:flex md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <span>© {new Date().getFullYear()} Nubuat</span>
        <span aria-hidden>•</span>
        <span>
          Data &amp; analisa untuk tujuan edukasi. Bukan rekomendasi investasi.
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/terms" className="hover:text-foreground">
          Syarat
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          Privasi
        </Link>
        <Link href="/disclaimer" className="hover:text-foreground">
          Disclosure
        </Link>
      </div>
    </footer>
  );
}
