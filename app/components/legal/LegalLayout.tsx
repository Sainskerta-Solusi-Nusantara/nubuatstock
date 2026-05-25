import Link from "next/link";

export function LegalLayout({
  title,
  lastUpdated,
  bodyMd,
  appName,
}: {
  title: string;
  lastUpdated: string;
  bodyMd: string;
  appName: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Slim top nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              N
            </span>
            {appName}
          </Link>
          <nav className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition">Terms</Link>
            <Link href="/disclaimer" className="hover:text-foreground transition">Disclaimer</Link>
            <Link href="/" className="rounded-md bg-secondary px-3 py-1.5 hover:bg-accent transition">← Beranda</Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-10 border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Terakhir diperbarui: {new Date(lastUpdated).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </header>

        <SimpleMarkdown content={bodyMd} />

        <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>
            Pertanyaan terkait dokumen ini? Email <a className="underline" href="mailto:legal@nubuat.id">legal@nubuat.id</a>.
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} {appName}. Dokumen dapat berubah — versi terbaru selalu di halaman ini.
          </p>
        </footer>
      </article>
    </div>
  );
}

/**
 * Minimal markdown renderer untuk legal pages — no JS dependency, no XSS risk.
 * Mendukung: # heading, **bold**, *italic*, code, list -, paragraf, table (basic).
 */
function SimpleMarkdown({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/);
  return (
    <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        // Heading 1
        if (trimmed.startsWith("# ")) {
          return <h1 key={i} className="mt-8 text-2xl font-bold">{stripMd(trimmed.slice(2))}</h1>;
        }
        // Heading 2
        if (trimmed.startsWith("## ")) {
          return <h2 key={i} className="mt-8 border-b border-border pb-2 text-xl font-bold text-primary">{stripMd(trimmed.slice(3))}</h2>;
        }
        // Heading 3
        if (trimmed.startsWith("### ")) {
          return <h3 key={i} className="mt-6 text-base font-semibold">{stripMd(trimmed.slice(4))}</h3>;
        }
        // Blockquote / warning
        if (trimmed.startsWith("> ")) {
          return (
            <div key={i} className="rounded-md border-l-4 border-primary/40 bg-primary/5 px-4 py-2 italic text-muted-foreground">
              {renderInline(trimmed.slice(2))}
            </div>
          );
        }
        // Horizontal rule
        if (trimmed === "---") {
          return <hr key={i} className="my-8 border-border" />;
        }
        // Table
        if (trimmed.startsWith("|")) {
          return <SimpleTable key={i} block={trimmed} />;
        }
        // Ordered list (1. ...)
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split("\n").filter((l) => /^\d+\.\s/.test(l));
          return (
            <ol key={i} className="ml-5 list-decimal space-y-1.5">
              {items.map((it, j) => (
                <li key={j}>{renderInline(it.replace(/^\d+\.\s/, ""))}</li>
              ))}
            </ol>
          );
        }
        // Unordered list (- ...)
        if (trimmed.startsWith("- ")) {
          const items = trimmed.split("\n").filter((l) => l.startsWith("- "));
          return (
            <ul key={i} className="ml-5 list-disc space-y-1.5">
              {items.map((it, j) => (
                <li key={j}>{renderInline(it.slice(2))}</li>
              ))}
            </ul>
          );
        }
        // Paragraph
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Order matters: bold before italic, link before bare URL
  const parts: Array<string | { type: "strong" | "em" | "code" | "link"; text: string; href?: string }> = [];
  let remaining = text;
  while (remaining.length > 0) {
    // Bold **xxx**
    const bold = remaining.match(/^\*\*([^*]+)\*\*/);
    if (bold) { parts.push({ type: "strong", text: bold[1]! }); remaining = remaining.slice(bold[0].length); continue; }
    // Link [text](url)
    const link = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (link) { parts.push({ type: "link", text: link[1]!, href: link[2]! }); remaining = remaining.slice(link[0].length); continue; }
    // Inline code `xxx`
    const code = remaining.match(/^`([^`]+)`/);
    if (code) { parts.push({ type: "code", text: code[1]! }); remaining = remaining.slice(code[0].length); continue; }
    // Plain text up to next special char
    const next = remaining.search(/[`*[]/);
    if (next === -1) { parts.push(remaining); break; }
    if (next === 0) { parts.push(remaining[0]!); remaining = remaining.slice(1); continue; }
    parts.push(remaining.slice(0, next));
    remaining = remaining.slice(next);
  }
  return parts.map((p, i) => {
    if (typeof p === "string") return <span key={i}>{p}</span>;
    if (p.type === "strong") return <strong key={i}>{p.text}</strong>;
    if (p.type === "em") return <em key={i}>{p.text}</em>;
    if (p.type === "code") return <code key={i} className="rounded bg-secondary px-1 py-0.5 text-xs">{p.text}</code>;
    if (p.type === "link") return <a key={i} href={p.href} className="text-primary underline">{p.text}</a>;
    return null;
  });
}

function stripMd(s: string): string {
  return s.replace(/\*\*/g, "").replace(/\*/g, "").trim();
}

function SimpleTable({ block }: { block: string }) {
  const rows = block.split("\n").filter((l) => l.startsWith("|"));
  if (rows.length < 2) return <p>{block}</p>;
  const headers = rows[0]!.split("|").slice(1, -1).map((h) => h.trim());
  const dataRows = rows.slice(2).map((r) => r.split("|").slice(1, -1).map((c) => c.trim()));
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">{renderInline(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
