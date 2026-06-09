import Link from "next/link";
import { LifeBuoy, BookOpen, GraduationCap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { HelpCenterView } from "./view";

export const metadata = {
  title: "Help Center & FAQ — Nubuat",
  description:
    "Pusat bantuan Nubuat: jawaban cepat soal akun & login, langganan & trial 1 hari, paper trading gratis, AI Buddy, alerts, data harga, dan pembayaran.",
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <LifeBuoy className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Pertanyaan yang paling sering ditanyakan, dijawab singkat. Cari topik
          kamu di bawah atau filter per kategori.
        </p>
      </header>

      {/* Arahkan ke resource lain biar tidak duplikat */}
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Butuh penjelasan lebih dalam? FAQ ini melengkapi panduan kami.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/guidance"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
            >
              <BookOpen className="h-3.5 w-3.5" /> Cara pakai fitur
            </Link>
            <Link
              href="/academy"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-accent"
            >
              <GraduationCap className="h-3.5 w-3.5" /> Belajar saham
            </Link>
          </div>
        </CardContent>
      </Card>

      <HelpCenterView />

      <Card className="bg-card/40">
        <CardContent className="p-4 text-center text-xs text-muted-foreground">
          <p>
            Tidak menemukan jawabanmu? Hubungi kami di{" "}
            <a href="mailto:support@nubuat.id" className="text-primary underline">
              support@nubuat.id
            </a>
            .
          </p>
          <p className="mt-1">
            Konten Nubuat bersifat edukasi & analisis data, bukan saran
            investasi. Selalu lakukan riset & kelola risiko sendiri.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
