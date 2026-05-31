import Link from "next/link";
import { ArrowRight, Bot, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AiTab({ ticker }: { ticker: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-4 text-primary" aria-hidden />
          AI Buddy — Konteks {ticker}
        </CardTitle>
        <CardDescription>
          Ajukan pertanyaan dengan konteks ticker ini aktif.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          UI percakapan penuh tersedia di halaman AI Buddy.
        </p>
        <Button asChild variant="default" size="sm">
          <Link href={`/copilot?ticker=${ticker}`} className="inline-flex items-center gap-2">
            <Sparkles className="size-3.5" aria-hidden />
            Buka AI Buddy dengan konteks {ticker}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
