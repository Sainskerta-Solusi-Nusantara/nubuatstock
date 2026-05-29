import { GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { AcademyModuleList } from "@/components/academy/AcademyModuleList";
import { ACADEMY_MODULES, TOTAL_LESSON_COUNT } from "@/lib/academy/content";

export const metadata = {
  title: "Academy — Nubuat",
  description:
    "Belajar saham IDX dari nol: dasar saham, analisis teknikal, bandarmology, dan manajemen risiko. Modul edukasi terstruktur di dalam Nubuat.",
};

export default function AcademyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Academy</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Modul belajar saham IDX dari pemula sampai menengah. {ACADEMY_MODULES.length} modul,{" "}
          {TOTAL_LESSON_COUNT} lesson singkat. Bangun fondasi sebelum mengandalkan sinyal & verdict
          di Nubuat.
        </p>
      </header>

      {/* Beda Academy vs Guidance */}
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Academy mengajarkan konsep, Guidance mengajarkan fitur.</p>
              <p className="mt-1 text-muted-foreground">
                Di sini kamu belajar <em>cara kerja pasar saham</em>. Untuk cara memakai modul Nubuat
                (Verdict, Wyckoff, Screener, dll.), buka{" "}
                <Link href="/guidance" className="text-primary underline">
                  Guidance
                </Link>
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AcademyModuleList />

      <Card className="bg-card/40">
        <CardContent className="p-4 text-center text-xs text-muted-foreground">
          <p>
            Konten Academy bersifat edukasi, bukan saran investasi. Selalu lakukan riset & kelola
            risiko sendiri.
          </p>
          <p className="mt-1">
            Ada saran materi baru?{" "}
            <a href="mailto:product@nubuat.id" className="text-primary underline">
              product@nubuat.id
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
