/**
 * Navbar publik shared untuk semua halaman marketing (landing, /about, /glossary,
 * /features, /pricing, /picks-archive). Sebelumnya inline di app/page.tsx sehingga
 * halaman lain kehilangan menu atas — sekarang dipakai bersama supaya konsisten.
 *
 * Link "Fitur" pakai `/#features` (anchor di landing) agar tetap berfungsi dari
 * halaman mana pun, bukan cuma di landing.
 */
import Link from "next/link";
import { NavAuthButtons } from "./NavAuthButtons";

export function PublicNav({
  appName = "Nubuat",
  ctaText = "Coba Gratis",
}: {
  appName?: string;
  ctaText?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            N
          </span>
          {appName}
        </Link>
        <nav className="hidden items-center gap-6 text-sm sm:flex">
          <Link href="/about" className="text-muted-foreground hover:text-foreground transition">About Us</Link>
          <Link href="/#features" className="text-muted-foreground hover:text-foreground transition">Fitur</Link>
          <Link href="/#academy" className="text-muted-foreground hover:text-foreground transition">Academy</Link>
          <Link href="/glossary" className="text-muted-foreground hover:text-foreground transition">Glossary</Link>
          <Link href="/research" className="text-muted-foreground hover:text-foreground transition">Riset</Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground transition">Harga</Link>
          <NavAuthButtons ctaText={ctaText} />
        </nav>
        <NavAuthButtons ctaText={ctaText} mobile />
      </div>
    </header>
  );
}
