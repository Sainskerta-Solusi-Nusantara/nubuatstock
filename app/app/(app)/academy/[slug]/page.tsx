import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, Clock, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { LessonMarkdown } from "@/components/academy/LessonMarkdown";
import { LessonReadToggle } from "@/components/academy/LessonReadToggle";
import {
  ACADEMY_LESSON_ORDER,
  getAdjacentLessons,
  getLessonBySlug,
} from "@/lib/academy/content";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ref = getLessonBySlug(slug);
  if (!ref) return { title: "Academy — Nubuat" };
  return {
    title: `${ref.lesson.title} — Academy — Nubuat`,
    description: ref.lesson.summary,
  };
}

export default async function AcademyLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ref = getLessonBySlug(slug);
  if (!ref) notFound();

  const { module: mod, lesson } = ref;
  const { prev, next } = getAdjacentLessons(slug);
  const lessonNumber = ACADEMY_LESSON_ORDER.findIndex((r) => r.lesson.slug === slug) + 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/academy"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Academy
      </Link>

      {/* Lesson header */}
      <header className="border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-primary">
            <GraduationCap className="h-3.5 w-3.5" />
            {mod.title}
          </span>
          <Badge variant={mod.level === "Pemula" ? "secondary" : "neutral"}>{mod.level}</Badge>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {lesson.readMinutes} menit baca
          </span>
          <span className="text-muted-foreground">
            Lesson {lessonNumber} dari {ACADEMY_LESSON_ORDER.length}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{lesson.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lesson.summary}</p>
      </header>

      {/* Body */}
      <article>
        <LessonMarkdown content={lesson.body} />
      </article>

      {/* Mark as read */}
      <div className="flex justify-center border-t border-border pt-5">
        <LessonReadToggle slug={lesson.slug} />
      </div>

      {/* Prev / Next nav */}
      <nav className="grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/academy/${prev.lesson.slug}`} className="group">
            <Card className="h-full transition group-hover:border-primary/50">
              <CardContent className="flex items-center gap-3 p-3">
                <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Sebelumnya
                  </div>
                  <div className="truncate text-sm font-medium">{prev.lesson.title}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <div className="hidden sm:block" />
        )}
        {next ? (
          <Link href={`/academy/${next.lesson.slug}`} className="group">
            <Card className="h-full transition group-hover:border-primary/50">
              <CardContent className="flex items-center justify-end gap-3 p-3 text-right">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Selanjutnya
                  </div>
                  <div className="truncate text-sm font-medium">{next.lesson.title}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Link href="/academy" className={cn("group", !prev && "sm:col-start-2")}>
            <Card className="h-full border-bull/40 transition group-hover:border-bull">
              <CardContent className="flex items-center justify-end gap-3 p-3 text-right">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-bull">
                    Selesai
                  </div>
                  <div className="truncate text-sm font-medium">Kembali ke daftar modul</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-bull" />
              </CardContent>
            </Card>
          </Link>
        )}
      </nav>
    </div>
  );
}
