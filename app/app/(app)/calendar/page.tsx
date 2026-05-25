import Link from "next/link";
import Image from "next/image";
import { Calendar as CalIcon, TrendingUp, Split, FileText, AlertCircle } from "lucide-react";
import { getCorporateActionCalendar, groupByDate, type CalendarEvent } from "@/lib/corporate-actions/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CorporateActionCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; ticker?: string; type?: string }>;
}) {
  const sp = await searchParams;

  // Default window: 30 days back + 60 days forward
  const today = new Date();
  const from = sp.from ?? new Date(today.getTime() - 30 * 86400_000).toISOString().slice(0, 10);
  const to = sp.to ?? new Date(today.getTime() + 60 * 86400_000).toISOString().slice(0, 10);

  const events = await getCorporateActionCalendar({
    from, to,
    ticker: sp.ticker?.trim(),
    type: (sp.type?.trim() as CalendarEvent["type"]) || undefined,
  });
  const grouped = groupByDate(events);

  // Summary counts per type
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar Aksi Korporasi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cum dividen, stock split, rights issue, dan aksi korporasi lainnya. Sumber data: IDX e-Reporting + Yahoo dividend history.
        </p>
      </div>

      {/* Filter */}
      <form className="flex flex-wrap items-end gap-2" method="get">
        <FormField label="Dari">
          <input type="date" name="from" defaultValue={from} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
        </FormField>
        <FormField label="Sampai">
          <input type="date" name="to" defaultValue={to} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
        </FormField>
        <FormField label="Ticker">
          <input type="text" name="ticker" defaultValue={sp.ticker ?? ""} placeholder="BBRI" maxLength={5} className="h-9 w-20 rounded-md border border-input bg-background px-3 font-mono text-sm uppercase" />
        </FormField>
        <FormField label="Jenis">
          <select name="type" defaultValue={sp.type ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Semua</option>
            <option value="dividend">Dividen</option>
            <option value="split">Split</option>
            <option value="rights">Rights/Bonus</option>
            <option value="ipo">IPO</option>
            <option value="delisting">Delisting</option>
          </select>
        </FormField>
        <button className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110">
          Filter
        </button>
      </form>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={TrendingUp} label="Dividen" value={counts.dividend ?? 0} />
        <SummaryCard icon={Split} label="Split / Reverse" value={counts.split ?? 0} />
        <SummaryCard icon={FileText} label="Rights / Bonus" value={counts.rights ?? 0} />
        <SummaryCard icon={AlertCircle} label="Lainnya" value={(counts.ipo ?? 0) + (counts.delisting ?? 0)} />
      </div>

      {/* Calendar grouped by date */}
      {grouped.size === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalIcon className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <h3 className="mt-4 font-semibold">Belum ada aksi korporasi di range ini</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Data aksi korporasi di-ingest dari Yahoo dividend history & IDX e-Reporting.
              Kalau kosong, mungkin: (a) tidak ada event di window dipilih, (b) data belum di-enrich
              untuk emiten yang difilter. Admin bisa tambah manual lewat <code className="rounded bg-secondary px-1">/admin/corporate-actions</code> (future).
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([date, evts]) => (
            <Card key={date}>
              <CardHeader className="bg-secondary/30 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {new Date(date).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </CardTitle>
                  <Badge variant="outline">{evts.length} event</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {evts.map((e, i) => (
                    <EventRow key={`${e.companyKode}-${e.type}-${i}`} event={e} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="rounded-md border border-border bg-card/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <strong>Catatan:</strong> Tanggal di sini adalah <strong>ex-date</strong> (cum date = 1 trading day sebelumnya).
        Untuk membeli & dapat dividen, Anda harus pegang saham pada cum date — beli di ex-date sudah tidak dapat dividen.
        Data dapat berubah; selalu verify di prospektus emiten atau idx.co.id.
      </p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-mono text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const TYPE_COLORS: Record<string, string> = {
    dividend: "bg-bull-soft text-bull",
    split: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    rights: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    ipo: "bg-bull-soft text-bull",
    delisting: "bg-bear-soft text-bear",
    rups: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  };

  return (
    <Link href={`/ticker/${event.companyKode}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition">
      {event.logoUrl ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white">
          <Image src={event.logoUrl} alt="" width={36} height={36} className="h-full w-full object-contain" unoptimized />
        </div>
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-sm font-bold text-primary">
          {event.companyKode.slice(0, 1)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold">{event.companyKode}</span>
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${TYPE_COLORS[event.type] ?? "bg-secondary"}`}>
            {event.type}
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate">{event.companyName ?? "—"}</div>
        {event.detail && <div className="text-[11px] text-muted-foreground italic mt-0.5">{event.detail}</div>}
      </div>
      <div className="shrink-0 text-right">
        <div className="font-semibold text-sm">{event.title}</div>
        {event.amountIdr != null && (
          <div className="font-mono text-xs text-bull">
            Rp {new Intl.NumberFormat("id-ID").format(event.amountIdr)}/lembar
          </div>
        )}
      </div>
    </Link>
  );
}
