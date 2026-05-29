/**
 * Navbar publik shared untuk semua halaman marketing (landing, /about, /glossary,
 * /features, /pricing, /picks-archive). Sebelumnya inline di app/page.tsx sehingga
 * halaman lain kehilangan menu atas — sekarang dipakai bersama supaya konsisten.
 *
 * Link "Fitur" pakai `/#features` (anchor di landing) agar tetap berfungsi dari
 * halaman mana pun, bukan cuma di landing.
 */
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
        <a href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            N
          </span>
          {appName}
        </a>
        <nav className="hidden items-center gap-6 text-sm sm:flex">
          <a href="/about" className="text-muted-foreground hover:text-foreground transition">About Us</a>
          <a href="/#features" className="text-muted-foreground hover:text-foreground transition">Fitur</a>
          <a href="/glossary" className="text-muted-foreground hover:text-foreground transition">Glossary</a>
          <a href="/research" className="text-muted-foreground hover:text-foreground transition">Riset</a>
          <a href="/pricing" className="text-muted-foreground hover:text-foreground transition">Harga</a>
          <a href="/login" className="text-muted-foreground hover:text-foreground transition">Login</a>
          <a
            href="/signup?trial=pro"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            {ctaText}
          </a>
        </nav>
        <a
          href="/signup?trial=pro"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground sm:hidden"
        >
          Daftar
        </a>
      </div>
    </header>
  );
}
