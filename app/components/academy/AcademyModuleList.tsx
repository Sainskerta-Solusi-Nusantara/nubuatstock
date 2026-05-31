"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  Activity,
  Brain,
  Calculator,
  CandlestickChart,
  CheckCircle2,
  Coins,
  Compass,
  FileText,
  Globe,
  GraduationCap,
  LineChart,
  Radar,
  Rocket,
  Search,
  ShieldCheck,
  Triangle,
  Users,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ACADEMY_MODULES,
  ACADEMY_LESSON_ORDER,
  TOTAL_LESSON_COUNT,
  WMI_MODULE_SLUG,
} from "@/lib/academy/content";
import { useReadLessons } from "@/components/academy/useAcademyProgress";

const ICONS: Record<string, LucideIcon> = {
  GraduationCap,
  LineChart,
  Users,
  ShieldCheck,
  FileText,
  Compass,
  Award,
  Waves,
  Activity,
  Triangle,
  Calculator,
  CandlestickChart,
  Brain,
  Radar,
  Coins,
  Rocket,
  Globe,
};

const ALL_SLUGS = ACADEMY_LESSON_ORDER.map((ref) => ref.lesson.slug);

export function AcademyModuleList() {
  const read = useReadLessons(ALL_SLUGS);
  const [query, setQuery] = React.useState("");

  const q = query.trim().toLowerCase();

  // Pisahkan modul belajar umum vs modul Sertifikasi (WMI).
  const learningModules = ACADEMY_MODULES.filter((m) => m.slug !== WMI_MODULE_SLUG);
  const certModules = ACADEMY_MODULES.filter((m) => m.slug === WMI_MODULE_SLUG);

  // Filter pencarian: cocok judul/deskripsi modul ATAU judul lesson di dalamnya.
  const matches = (m: (typeof ACADEMY_MODULES)[number]) => {
    if (!q) return true;
    if (m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)) return true;
    return m.lessons.some((l) => l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q));
  };

  const filteredLearning = learningModules.filter(matches);
  const filteredCert = certModules.filter(matches);

  // Summary: modul selesai (semua lesson dibaca) + overall %.
  const totalRead = read.size;
  const overallPct = TOTAL_LESSON_COUNT > 0 ? Math.round((totalRead / TOTAL_LESSON_COUNT) * 100) : 0;
  const modulesCompleted = ACADEMY_MODULES.filter(
    (m) => m.lessons.length > 0 && m.lessons.every((l) => read.has(l.slug)),
  ).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <SummaryStat value={`${modulesCompleted}/${ACADEMY_MODULES.length}`} label="Modul selesai" />
            <SummaryStat value={`${totalRead}/${TOTAL_LESSON_COUNT}`} label="Lesson dibaca" />
            <SummaryStat value={`${overallPct}%`} label="Progress total" />
          </div>
          <Progress value={overallPct} className="mt-3" />
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari modul atau materi… (mis. candlestick, valuasi, psikologi)"
          aria-label="Cari modul Academy"
          className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      {/* Grid modul belajar */}
      {filteredLearning.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLearning.map((mod) => (
            <ModuleCard key={mod.slug} mod={mod} read={read} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Tidak ada modul yang cocok dengan &ldquo;{query}&rdquo;.
        </p>
      )}

      {/* Seksi Sertifikasi (WMI) — dipisah karena tidak semua orang butuh. */}
      {filteredCert.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pt-2">
            <Award className="size-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Sertifikasi
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCert.map((mod) => (
              <ModuleCard key={mod.slug} mod={mod} read={read} highlight />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function ModuleCard({
  mod,
  read,
  highlight,
}: {
  mod: (typeof ACADEMY_MODULES)[number];
  read: Set<string>;
  highlight?: boolean;
}) {
  const Icon = ICONS[mod.icon] ?? GraduationCap;
  const total = mod.lessons.length;
  const readCount = mod.lessons.filter((l) => read.has(l.slug)).length;
  const pct = total > 0 ? Math.round((readCount / total) * 100) : 0;
  const done = total > 0 && readCount === total;

  return (
    <Link href={`/academy/modul/${mod.slug}`} className="group block">
      <Card
        className={cn(
          "h-full transition hover:border-primary/50 hover:shadow-md",
          highlight && "border-primary/40 bg-primary/5",
        )}
      >
        <CardContent className="flex h-full flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            {done ? (
              <Badge className="gap-1 bg-bull/15 text-bull">
                <CheckCircle2 className="size-3" /> Selesai
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                {mod.level}
              </Badge>
            )}
          </div>
          <h3 className="mt-3 font-bold leading-snug group-hover:text-primary">{mod.title}</h3>
          <p className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">{mod.description}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Progress value={pct} className="h-1.5 flex-1" />
            <span className="shrink-0">
              {readCount}/{total}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
