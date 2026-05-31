"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RunnerQuestion {
  id: string;
  question: string;
  options: string[];
}

export function TryoutRunner({
  slug,
  title,
  durationMinutes,
  questions,
}: {
  slug: string;
  title: string;
  durationMinutes: number;
  questions: RunnerQuestion[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [current, setCurrent] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const startRef = React.useRef(Date.now());

  React.useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const answeredCount = Object.keys(answers).length;
  const q = questions[current]!;
  const limitSec = durationMinutes * 60;
  const overtime = elapsed > limitSec;

  const select = (qid: string, idx: number) => setAnswers((a) => ({ ...a, [qid]: idx }));

  async function submit() {
    if (answeredCount < questions.length) {
      const ok = confirm(
        `Masih ada ${questions.length - answeredCount} soal belum dijawab. Kumpulkan sekarang?`,
      );
      if (!ok) return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tryout/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageSlug: slug, answers, durationSec: elapsed }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error?.message ?? "Gagal mengumpulkan");
      router.push(`/academy/tryout/hasil/${data.data.attemptId}`);
    } catch (err) {
      toast.error((err as Error).message);
      setSubmitting(false);
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold tracking-tight">{title}</h1>
        <div className={`inline-flex items-center gap-1.5 text-sm ${overtime ? "text-bear" : "text-muted-foreground"}`}>
          <Clock className="size-4" /> {mm}:{ss}
          <span className="text-xs">/ {durationMinutes}:00</span>
        </div>
      </header>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {answeredCount}/{questions.length}
        </span>
      </div>

      {/* Question nav grid */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((qq, i) => (
          <button
            key={qq.id}
            onClick={() => setCurrent(i)}
            className={`size-7 rounded text-xs font-medium transition ${
              i === current
                ? "bg-primary text-primary-foreground"
                : answers[qq.id] !== undefined
                  ? "bg-bull/20 text-bull"
                  : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Current question */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start gap-2">
            <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {current + 1}
            </span>
            <p className="text-sm font-medium leading-relaxed">{q.question}</p>
          </div>
          <div className="space-y-2">
            {q.options.map((opt, idx) => {
              const selected = answers[q.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => select(q.id, idx)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40 hover:bg-accent"
                  }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm disabled:opacity-40"
        >
          <ChevronLeft className="size-4" /> Sebelumnya
        </button>
        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm"
          >
            Berikutnya <ChevronRight className="size-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? "Menilai…" : "Kumpulkan & Lihat Hasil"}
          </button>
        )}
      </div>
    </div>
  );
}
