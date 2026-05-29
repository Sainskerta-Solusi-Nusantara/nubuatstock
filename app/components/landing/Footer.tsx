import Link from "next/link";

export interface FooterProps {
  appName: string;
  tagline: string;
  supportEmail: string;
  disclaimer: string;
  imageCredits: string;
}

export function Footer(props: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-lg font-bold">{props.appName}</div>
            <p className="mt-2 text-sm text-muted-foreground">{props.tagline}</p>
          </div>

          <div>
            <div className="text-sm font-semibold">Produk</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-foreground">Fitur</Link></li>
              <li><Link href="/about" className="hover:text-foreground">About Us</Link></li>
              <li><Link href="/glossary" className="hover:text-foreground">Glossary</Link></li>
              <li><Link href="/subscription" className="hover:text-foreground">Harga</Link></li>
              <li><Link href="/signup?trial=pro" className="hover:text-foreground">Trial Gratis 7 Hari</Link></li>
              <li><Link href="/picks" className="hover:text-foreground">Daily Picks</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold">Dukungan</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href={`mailto:${props.supportEmail}`} className="hover:text-foreground">{props.supportEmail}</a></li>
              <li><Link href="/login" className="hover:text-foreground">Login</Link></li>
              <li><Link href="/signup" className="hover:text-foreground">Daftar</Link></li>
            </ul>
          </div>

          <div>
            <div className="text-sm font-semibold">Legal</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              <li><Link href="/disclaimer" className="hover:text-foreground">Disclaimer</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 rounded-md border border-border bg-background p-4 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Disclaimer:</strong> {props.disclaimer}
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>© {year} {props.appName}. Bukan broker. Bukan ajakan jual/beli.</span>
          <span>{props.imageCredits}</span>
        </div>
      </div>
    </footer>
  );
}
