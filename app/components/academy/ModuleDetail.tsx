"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useReadLessons } from "@/components/academy/useAcademyProgress";
import { WMI_MODULE_SLUG } from "@/lib/academy/content";

interface LessonLite {
  slug: string;
  title: string;
  summary: string;
  readMinutes: number;
}

export function ModuleDetail({
  slug,
  title,
  description,
  level,
  lessons,
}: {
  slug: string;
  title: string;
  description: string;
  level: string;
  lessons: LessonLite[];
}) {
  const read = useReadLessons(lessons.map((l) => l.slug));
  const readCount = lessons.filter((l) => read.has(l.slug)).length;
  const pct = lessons.length > 0 ? Math.round((readCount / lessons.length) * 100) : 0;
  const isWmi = slug === WMI_MODULE_SLUG;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/academy"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Semua modul
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <Badge variant="secondary" className="text-[10px]">{level}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="shrink-0">{readCount}/{lessons.length} lesson</span>
        </div>
      </div>

      {/* CTA Try Out khusus modul WMI */}
      {isWmi && (
        <Link
          href="/academy/tryout"
          className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 transition hover:border-primary/60"
        >
          <div>
            <p className="font-semibold">Siap berlatih? Buka Try Out WMI</p>
            <p className="text-xs text-muted-foreground">10 paket soal + pembahasan + sertifikat kalau lulus.</p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-primary" />
        </Link>
      )}

      <Card>
        <CardContent className="p-2">
          <ul className="divide-y divide-border">
            {lessons.map((lesson, i) => {
              const isRead = read.has(lesson.slug);
              return (
                <li key={lesson.slug}>
                  <Link
                    href={`/academy/${lesson.slug}`}
                    className="group flex items-center gap-3 rounded-md px-3 py-3 hover:bg-accent"
                  >
                    {isRead ? (
                      <CheckCircle2 className="size-5 shrink-0 text-bull" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{i + 1}.</span>
                        <span className="font-medium group-hover:text-primary">{lesson.title}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{lesson.summary}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> {lesson.readMinutes}m
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
