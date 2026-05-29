"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils/cn";
import type { WatchlistItemView } from "@/lib/types/watchlist";

interface WatchlistTableProps {
  items: WatchlistItemView[];
  onRemove?: (itemId: string) => void;
  onOpenTicker?: (companyKode: string) => void;
  /** Dipanggil saat hover/focus baris — untuk prefetch route ticker (UX instan). */
  onPrefetchTicker?: (companyKode: string) => void;
}

const numberFmt = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});
const pctFmt = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const columnHelper = createColumnHelper<WatchlistItemView>();

export function WatchlistTable({
  items,
  onRemove,
  onOpenTicker,
  onPrefetchTicker,
}: WatchlistTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("companyKode", {
        header: "Kode",
        cell: (info) => {
          const code = info.getValue();
          const name = info.row.original.namaPerusahaan;
          return (
            <button
              type="button"
              onClick={() => onOpenTicker?.(code)}
              onMouseEnter={() => onPrefetchTicker?.(code)}
              onFocus={() => onPrefetchTicker?.(code)}
              className="text-left hover:underline"
            >
              <div className="font-mono font-semibold">{code}</div>
              {name ? (
                <div className="text-xs text-muted-foreground truncate max-w-[240px]">{name}</div>
              ) : null}
            </button>
          );
        },
      }),
      columnHelper.accessor((row) => row.quote?.last ?? null, {
        id: "last",
        header: () => <div className="text-right">Last</div>,
        cell: (info) => {
          const v = info.getValue() as number | null;
          return (
            <div className="text-right num font-mono">
              {v == null ? "—" : numberFmt.format(v)}
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.quote?.changePct ?? null, {
        id: "changePct",
        header: () => <div className="text-right">% Chg</div>,
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v == null) return <div className="text-right num font-mono">—</div>;
          const cls = v > 0 ? "text-bull" : v < 0 ? "text-bear" : "text-neutral";
          return <div className={cn("text-right num font-mono", cls)}>{pctFmt.format(v)}%</div>;
        },
      }),
      columnHelper.accessor((row) => row.quote?.volume ?? null, {
        id: "volume",
        header: () => <div className="text-right">Volume</div>,
        cell: (info) => {
          const v = info.getValue() as number | null;
          return (
            <div className="text-right num font-mono">{v == null ? "—" : numberFmt.format(v)}</div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: (info) => (
          <div className="text-right">
            <button
              type="button"
              onClick={() => onRemove?.(info.row.original.id)}
              className="text-xs text-muted-foreground hover:text-bear transition"
              aria-label={`Hapus ${info.row.original.companyKode}`}
            >
              Hapus
            </button>
          </div>
        ),
      }),
    ],
    [onOpenTicker, onPrefetchTicker, onRemove],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Watchlist masih kosong. Tambahkan emiten lewat tombol di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="px-4 py-2 font-medium text-muted-foreground text-left"
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-border hover:bg-muted/20 transition">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
