import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FeedbackDialog } from "./FeedbackDialog";

/**
 * Entry point bantuan di dashboard: kirim feedback cepat atau buka tiket support.
 */
export function HelpCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="size-4 text-primary" aria-hidden />
          Butuh bantuan?
        </CardTitle>
        <CardDescription>
          Kirim masukan atau buka tiket bantuan — tim kami siap bantu kamu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row">
          <FeedbackDialog />
          <Button asChild size="sm" variant="default">
            <Link href="/support">Buat Tiket Bantuan</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
