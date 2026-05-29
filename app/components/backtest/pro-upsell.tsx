"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProUpsell({ feature }: { feature: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mt-4 font-semibold">{feature} khusus paket Pro ke atas</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {feature} bantu kamu nilai apakah strategi beneran robust atau cuma beruntung di satu periode.
          Upgrade ke Pro untuk buka fitur backtesting lanjutan.
        </p>
        <Button asChild className="mt-5">
          <Link href="/subscription">
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade ke Pro
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
