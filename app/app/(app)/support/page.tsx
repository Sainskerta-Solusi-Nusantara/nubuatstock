import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { requireSession } from "@/lib/auth/server";
import { listUserTickets } from "@/lib/support/service";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NewTicketForm } from "@/components/support/NewTicketForm";
import { STATUS_META } from "@/components/support/ticket-meta";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bantuan & Tiket",
};

export default async function SupportPage() {
  const session = await requireSession();
  const tickets = await listUserTickets(session.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <LifeBuoy className="size-5 text-primary" aria-hidden />
          Bantuan & Tiket
        </h1>
        <p className="text-sm text-muted-foreground">
          Buka tiket buat masalah yang butuh tindak lanjut. Tim kami balas lewat
          thread di sini.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Tiket kamu</CardTitle>
            <CardDescription>
              Riwayat tiket bantuan & statusnya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <EmptyState
                icon={<LifeBuoy className="size-5" />}
                title="Belum ada tiket"
                description="Kalau ada kendala atau pertanyaan, buat tiket di samping. Kami usahakan balas secepatnya."
              />
            ) : (
              <ul className="divide-y">
                {tickets.map((t) => {
                  const meta = STATUS_META[t.status];
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/support/${t.id}`}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {t.subject}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.createdAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <Badge variant={meta.variant} className="shrink-0">
                          {meta.label}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Buat tiket</CardTitle>
            <CardDescription>Jelaskan kendala kamu.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewTicketForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
