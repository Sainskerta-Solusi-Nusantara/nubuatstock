import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <div className="text-lg font-bold tracking-tight text-foreground">
          Nubuat
        </div>
        <p className="mt-8 text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          URL yang Anda buka tidak ada atau sudah dipindahkan.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Kembali ke beranda
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link href="/screener" className="hover:text-foreground">
            Screener
          </Link>
          <span aria-hidden>•</span>
          <Link href="/picks" className="hover:text-foreground">
            Daily Picks
          </Link>
        </div>
      </div>
    </div>
  );
}
