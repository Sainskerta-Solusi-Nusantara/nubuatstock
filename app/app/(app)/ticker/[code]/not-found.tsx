import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TickerNotFound() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="rounded-full bg-muted p-3">
            <Compass className="size-6 text-muted-foreground" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">Ticker tidak ditemukan</p>
            <p className="text-sm text-muted-foreground">
              Pastikan kode ticker valid (3-6 huruf/angka kapital) dan sudah
              terdaftar pada metadata emiten.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/">Beranda</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/picks">Daily Picks</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
