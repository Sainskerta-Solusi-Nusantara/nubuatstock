import Link from "next/link";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { listAttempts, getTryoutStats } from "@/lib/tryout/service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Riwayat Try Out WMI | Nubuat" };

export default async function TryoutHistoryPage() {
  const session = await requireSession();
  const [stats, attempts] = await Promise.all([
    getTryoutStats(session.userId),
    listAttempts(session.userId, 100),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/academy/tryout" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Kembali ke Try Out
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Riwayat Try Out</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats.attempts} percobaan · {stats.passed} lulus · skor terbaik {stats.bestScore}%
        </p>
      </header>

      {attempts.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Belum ada riwayat. <Link href="/academy/tryout" className="text-primary underline">Mulai try out pertamamu</Link>.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {attempts.map((a) => (
            <Link key={a.id} href={`/academy/tryout/hasil/${a.id}`}>
              <Card className="transition hover:border-primary/40">
                <CardContent className="flex items-center justify-between gap-3 p-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {a.passed ? (
                        <CheckCircle2 className="size-4 shrink-0 text-bull" />
                      ) : (
                        <XCircle className="size-4 shrink-0 text-bear" />
                      )}
                      <span className="truncate text-sm font-medium">{a.packageTitle}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.submittedAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={`text-lg font-bold ${a.passed ? "text-bull" : "text-bear"}`}>
                      {a.scorePct}%
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {a.correctCount}/{a.totalQuestions}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
