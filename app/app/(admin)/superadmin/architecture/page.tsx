import { Layers3, Database, Cpu, Workflow, Cloud, Code2, GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/superadmin/PrintButton";
import { ARCHITECTURE_LAYERS, TECH_STACK, DATA_PIPELINES } from "@/lib/pitchdeck/data";

export const dynamic = "force-dynamic";

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Frontend: Code2,
  "Backend / API": Cpu,
  Database: Database,
  "AI Layer": Cpu,
  "Background Jobs (Worker)": Workflow,
  "Infra & Deploy": Cloud,
};

export default function ArchitecturePage() {
  return (
    <div className="space-y-8 print:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Layers3 className="h-7 w-7 text-primary" />
            Arsitektur Teknis
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Dokumentasi lengkap stack &amp; alur data Nubuat — frontend, backend, database, AI,
            background jobs, hingga cara mendapatkan harga saham &amp; berita. Internal &amp;
            investor only. Hanya superadmin yang bisa akses halaman ini.
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Ringkasan layer (high-level) */}
      <section>
        <SectionTitle icon={Layers3} title="Lapisan Arsitektur (High-Level)" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ARCHITECTURE_LAYERS.map((l) => (
            <Card key={l.layer}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{l.layer}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="space-y-1">
                  {l.components.map((c) => (
                    <li key={c} className="flex gap-1.5 text-xs text-foreground">
                      <span className="text-primary">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="border-t border-border pt-2 text-[11px] italic text-muted-foreground">
                  {l.rationale}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Stack teknologi detail per kategori */}
      <section>
        <SectionTitle icon={Code2} title="Stack Teknologi (Detail)" />
        <div className="space-y-4">
          {TECH_STACK.map((g) => {
            const Icon = CATEGORY_ICON[g.category] ?? Code2;
            return (
              <Card key={g.category}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    {g.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-sm">
                      <tbody>
                        {g.items.map((it) => (
                          <tr key={it.name} className="border-b border-border/60 last:border-0">
                            <td className="whitespace-nowrap py-2 pr-4 align-top font-medium">{it.name}</td>
                            <td className="py-2 align-top text-muted-foreground">{it.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Pipeline data: harga, news, riset */}
      <section>
        <SectionTitle icon={GitBranch} title="Alur Data: Harga, Berita & Scraping" />
        <div className="grid gap-4 lg:grid-cols-2">
          {DATA_PIPELINES.map((p) => (
            <Card key={p.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.title}</CardTitle>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">Sumber: {p.source}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Metode:</span> {p.method}
                </p>
                <ol className="space-y-1.5">
                  {p.flow.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <p className="rounded-md border border-border bg-muted/40 p-2 text-[11px] italic text-muted-foreground">
                  {p.note}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <p className="border-t border-border pt-4 text-[11px] text-muted-foreground">
        Dokumen ini mencerminkan implementasi nyata di codebase. Jaga kerahasiaan —
        berisi detail arsitektur, sumber data, dan keamanan internal.
      </p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
      <Icon className="h-5 w-5 text-primary" />
      {title}
    </h2>
  );
}
