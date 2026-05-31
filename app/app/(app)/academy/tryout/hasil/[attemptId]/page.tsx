import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Download, RotateCcw, ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { getAttempt } from "@/lib/tryout/service";

export const dynamic = "force-dynamic";

export default async function TryoutResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const session = await requireSession();
  const { attemptId } = await params;
  const r = await getAttempt(session.userId, attemptId);
  if (!r) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/academy/tryout" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Kembali ke Try Out
      </Link>

      {/* Skor */}
      <Card className={r.passed ? "border-bull/40" : "border-bear/40"}>
        <CardContent className="p-6 text-center">
          <div className={`text-5xl font-bold ${r.passed ? "text-bull" : "text-bear"}`}>{r.scorePct}%</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {r.correct} dari {r.total} benar · {r.packageTitle}
          </p>
          <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
            r.passed ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"
          }`}>
            {r.passed ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
            {r.passed ? "LULUS" : `Belum lulus (min. ${r.passThreshold}%)`}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {r.passed && (
              <a
                href={`/api/tryout/certificate/${r.attemptId}`}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
              >
                <Download className="size-4" /> Download Sertifikat (PDF)
              </a>
            )}
            <Link
              href={`/academy/tryout/${r.packageSlug}`}
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              <RotateCcw className="size-4" /> Coba lagi
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Per domain */}
      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Rincian per topik</h2>
          <div className="space-y-2">
            {r.byDomain.map((d) => (
              <div key={d.domain} className="flex items-center gap-3 text-sm">
                <span className="w-48 shrink-0 truncate text-muted-foreground">{d.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${d.total ? (d.correct / d.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
                  {d.correct}/{d.total}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pembahasan */}
      <div>
        <h2 className="mb-3 text-lg font-bold">Pembahasan</h2>
        <div className="space-y-3">
          {r.questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-2">
                  {q.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-bull" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-bear" />
                  )}
                  <p className="text-sm font-medium">
                    <span className="text-muted-foreground">{i + 1}. </span>
                    {q.question}
                  </p>
                </div>
                <div className="space-y-1.5 pl-7">
                  {q.options.map((opt, idx) => {
                    const isCorrect = idx === q.correctIndex;
                    const isSelected = idx === q.selectedIndex;
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
                          isCorrect
                            ? "border-bull/40 bg-bull/10"
                            : isSelected
                              ? "border-bear/40 bg-bear/10"
                              : "border-transparent"
                        }`}
                      >
                        <span className="font-semibold">{String.fromCharCode(65 + idx)}.</span>
                        <span className="flex-1">{opt}</span>
                        {isCorrect && <span className="text-[10px] font-bold text-bull">JAWABAN</span>}
                        {isSelected && !isCorrect && <span className="text-[10px] font-bold text-bear">PILIHANMU</span>}
                      </div>
                    );
                  })}
                </div>
                {q.selectedIndex === null && (
                  <p className="pl-7 text-xs text-muted-foreground">Tidak dijawab.</p>
                )}
                <div className="ml-7 rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Pembahasan: </span>
                  {q.explanation}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
