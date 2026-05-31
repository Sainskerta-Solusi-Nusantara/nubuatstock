import Link from "next/link";
import { GraduationCap, History, CheckCircle2, FileQuestion } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRYOUT_PACKAGES } from "@/lib/tryout/packages";
import { listAttempts, getTryoutStats } from "@/lib/tryout/service";
import { TRYOUT_PASS_THRESHOLD } from "@/lib/tryout/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Try Out WMI — Academy | Nubuat",
  description: "Latihan ujian WMI (Wakil Manajer Investasi) dengan 10 paket soal + pembahasan & sertifikat.",
};

export default async function TryoutListPage() {
  const session = await requireSession();
  const [stats, attempts] = await Promise.all([
    getTryoutStats(session.userId),
    listAttempts(session.userId, 100),
  ]);
  const passedSlugs = new Set(attempts.filter((a) => a.passed).map((a) => a.packageSlug));
  const bestBySlug = new Map<string, number>();
  for (const a of attempts) {
    bestBySlug.set(a.packageSlug, Math.max(bestBySlug.get(a.packageSlug) ?? 0, a.scorePct));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <GraduationCap className="size-6 text-primary" /> Try Out WMI
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            10 paket soal latihan persiapan ujian Wakil Manajer Investasi. Lulus (skor ≥{" "}
            {TRYOUT_PASS_THRESHOLD}%) untuk dapat sertifikat.
          </p>
        </div>
        <Link
          href="/academy/tryout/history"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          <History className="size-4" /> Riwayat
        </Link>
      </header>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        ⚠️ Soal latihan ini <strong>disusun berdasarkan silabus resmi WMI</strong> untuk tujuan
        edukasi — <strong>bukan</strong> reproduksi soal ujian asli, dan sertifikat penyelesaiannya
        bukan sertifikasi resmi WMI.
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Percobaan" value={String(stats.attempts)} />
        <StatCard label="Lulus" value={String(stats.passed)} />
        <StatCard label="Paket dilulusi" value={`${stats.packagesPassed}/10`} />
        <StatCard label="Skor terbaik" value={`${stats.bestScore}%`} />
      </div>

      {/* Packages */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TRYOUT_PACKAGES.map((p) => {
          const passed = passedSlugs.has(p.slug);
          const best = bestBySlug.get(p.slug);
          return (
            <Card key={p.slug} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Paket {p.number}</span>
                  {passed ? (
                    <CheckCircle2 className="size-5 text-bull" />
                  ) : (
                    <FileQuestion className="size-5 text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-3">
                <p className="flex-1 text-xs text-muted-foreground">{p.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{p.questions.length} soal</span>
                  <span>·</span>
                  <span>{p.durationMinutes} menit</span>
                  {best !== undefined && (
                    <>
                      <span>·</span>
                      <span className={passed ? "text-bull" : ""}>terbaik {best}%</span>
                    </>
                  )}
                </div>
                <Link
                  href={`/academy/tryout/${p.slug}`}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
                >
                  {best !== undefined ? "Coba lagi" : "Mulai"}
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
