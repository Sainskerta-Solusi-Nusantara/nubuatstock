"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Compass,
  FileText,
  GraduationCap,
  LineChart,
  ShieldCheck,
  Users,
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
};

const ALL_SLUGS = ACADEMY_LESSON_ORDER.map((ref) => ref.lesson.slug);

export function AcademyModuleList() {
  const read = useReadLessons(ALL_SLUGS);
  const totalRead = read.size;
  const overallPct = TOTAL_LESSON_COUNT > 0 ? Math.round((totalRead / TOTAL_LESSON_COUNT) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold">Progress kamu</span>
            <span className="text-muted-foreground">
              {totalRead} / {TOTAL_LESSON_COUNT} lesson selesai
            </span>
          </div>
          <Progress value={overallPct} />
          <p className="mt-2 text-xs text-muted-foreground">
            {overallPct === 100
              ? "Mantap! Kamu sudah menyelesaikan semua modul Academy."
              : "Tandai lesson sebagai selesai saat sudah dibaca untuk melacak progres kamu."}
          </p>
        </CardContent>
      </Card>

      {/* Modules */}
      <div className="space-y-5">
        {ACADEMY_MODULES.map((mod) => {
          const Icon = ICONS[mod.icon] ?? GraduationCap;
          const lessonSlugs = mod.lessons.map((l) => l.slug);
          const doneCount = lessonSlugs.filter((s) => read.has(s)).length;
          const pct = Math.round((doneCount / mod.lessons.length) * 100);
          const complete = doneCount === mod.lessons.length;

          return (
            <Card key={mod.slug} className={cn(complete && "border-bull/40")}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      complete ? "bg-bull/15 text-bull" : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold tracking-tight">{mod.title}</h2>
                      <Badge variant={mod.level === "Pemula" ? "secondary" : "neutral"}>
                        {mod.level}
                      </Badge>
                      {complete && (
                        <Badge variant="bull" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Selesai
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>

                    <div className="mt-3 flex items-center gap-2">
                      <Progress value={pct} className="h-1.5" />
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {doneCount}/{mod.lessons.length}
                      </span>
                    </div>

                    {/* Lessons */}
                    <ul className="mt-3 divide-y divide-border rounded-md border border-border">
                      {mod.lessons.map((lesson) => {
                        const isRead = read.has(lesson.slug);
                        return (
                          <li key={lesson.slug}>
                            <Link
                              href={`/academy/${lesson.slug}`}
                              className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-accent"
                            >
                              {isRead ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-bull" />
                              ) : (
                                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <div className="min-w-0 flex-1">
                                <div
                                  className={cn(
                                    "truncate text-sm font-medium",
                                    isRead && "text-muted-foreground",
                                  )}
                                >
                                  {lesson.title}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {lesson.summary}
                                </div>
                              </div>
                              <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
                                <Clock className="h-3 w-3" />
                                {lesson.readMinutes} mnt
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
