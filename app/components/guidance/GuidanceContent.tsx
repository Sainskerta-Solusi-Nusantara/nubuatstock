import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { GuidanceBlock, GuidanceSection } from "@/lib/guidance/content";

/**
 * Renderer for guidance sections — converts content blocks to JSX.
 * Markdown-lite: bold via **...**, code inline kalau perlu.
 */

function inline(text: string): React.ReactNode[] {
  // Simple **bold** parser. Keep other markdown ignored.
  const out: React.ReactNode[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (let i = 0; i < parts.length; i += 1) {
    const p = parts[i]!;
    if (p.startsWith("**") && p.endsWith("**")) {
      out.push(<strong key={i}>{p.slice(2, -2)}</strong>);
    } else if (p.length > 0) {
      out.push(p);
    }
  }
  return out;
}

function Block({ block }: { block: GuidanceBlock }) {
  switch (block.type) {
    case "heading":
      if (block.level === 2) {
        return <h2 className="mt-6 text-xl font-bold tracking-tight">{inline(block.text)}</h2>;
      }
      if (block.level === 3) {
        return <h3 className="mt-5 text-base font-bold">{inline(block.text)}</h3>;
      }
      return <h4 className="mt-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">{inline(block.text)}</h4>;
    case "paragraph":
      return <p className="text-sm leading-relaxed text-muted-foreground">{inline(block.text)}</p>;
    case "list":
      if (block.ordered) {
        return (
          <ol className="ml-5 list-decimal space-y-1 text-sm leading-relaxed text-muted-foreground">
            {block.items.map((it, i) => (
              <li key={i}>{inline(it)}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="ml-5 list-disc space-y-1 text-sm leading-relaxed text-muted-foreground">
          {block.items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ul>
      );
    case "code":
      return (
        <pre className="overflow-x-auto rounded-md bg-secondary p-3 text-[11px] leading-relaxed">
          <code>{block.text}</code>
        </pre>
      );
    case "note": {
      const config = {
        info: { Icon: Info, classes: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
        warning: { Icon: AlertTriangle, classes: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300" },
        success: { Icon: CheckCircle2, classes: "border-bull/40 bg-bull-soft text-bull" },
      };
      const c = config[block.tone];
      const Icon = c.Icon;
      return (
        <div className={cn("rounded-md border p-3 text-sm", c.classes)}>
          <div className="flex items-center gap-1.5 font-semibold">
            <Icon className="h-4 w-4" />
            {block.title}
          </div>
          <p className="mt-1 text-xs leading-relaxed opacity-90">{inline(block.body)}</p>
        </div>
      );
    }
    case "kv":
      return (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {block.rows.map((r, i) => (
                <tr key={i}>
                  <td className="w-1/3 bg-muted/30 px-3 py-2 align-top font-semibold">{inline(r.key)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{inline(r.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "steps":
      return (
        <ol className="space-y-2">
          {block.items.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold">{inline(s.title)}</div>
                <div className="text-xs leading-relaxed text-muted-foreground">{inline(s.body)}</div>
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export function GuidanceSectionView({ section }: { section: GuidanceSection }) {
  return (
    <article id={section.id} className="space-y-3 scroll-mt-20">
      <header className="border-b border-border pb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {section.category}
        </div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">{section.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>
      </header>
      <div className="space-y-3">
        {section.contents.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </article>
  );
}
