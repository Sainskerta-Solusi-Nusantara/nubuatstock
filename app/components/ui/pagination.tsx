import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface PaginationProps {
  currentPage: number;
  /** Total item (bukan total page). Page count dihitung dari `Math.ceil(totalItems / pageSize)`. */
  totalItems: number;
  pageSize: number;
  /** Base path tanpa `?page=`. Search params lain di-preserve via `searchParams`. */
  basePath: string;
  /** Query params lain yang harus dipertahankan di link (mis. filter source, sentiment). */
  searchParams?: Record<string, string | undefined>;
  /** Max visible page numbers (default 5). */
  maxVisible?: number;
}

function buildHref(
  basePath: string,
  page: number,
  searchParams: Record<string, string | undefined> = {},
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v) params.set(k, v);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function pageRange(current: number, total: number, max: number): Array<number | "…"> {
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | "…"> = [];
  const side = Math.floor((max - 3) / 2);
  const left = Math.max(2, current - side);
  const right = Math.min(total - 1, current + side);
  items.push(1);
  if (left > 2) items.push("…");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < total - 1) items.push("…");
  items.push(total);
  return items;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  basePath,
  searchParams = {},
  maxVisible = 7,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const page = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3"
      aria-label="Pagination"
    >
      <p className="text-xs text-muted-foreground">
        Menampilkan <strong>{startItem.toLocaleString("id-ID")}</strong>–
        <strong>{endItem.toLocaleString("id-ID")}</strong> dari{" "}
        <strong>{totalItems.toLocaleString("id-ID")}</strong>
      </p>
      <div className="flex items-center gap-1">
        <PageLink
          href={buildHref(basePath, page - 1, searchParams)}
          disabled={page <= 1}
          ariaLabel="Halaman sebelumnya"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </PageLink>
        {pageRange(page, totalPages, maxVisible).map((p, i) =>
          p === "…" ? (
            <span
              key={`gap-${i}`}
              className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </span>
          ) : (
            <PageLink
              key={p}
              href={buildHref(basePath, p, searchParams)}
              active={p === page}
              ariaLabel={`Halaman ${p}`}
            >
              {p}
            </PageLink>
          ),
        )}
        <PageLink
          href={buildHref(basePath, page + 1, searchParams)}
          disabled={page >= totalPages}
          ariaLabel="Halaman selanjutnya"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  active,
  disabled,
  ariaLabel,
  children,
}: {
  href: string;
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition";
  const cls = active
    ? "border-primary bg-primary text-primary-foreground"
    : disabled
      ? "border-border bg-muted text-muted-foreground cursor-not-allowed pointer-events-none opacity-50"
      : "border-border bg-background hover:bg-accent";

  if (disabled) {
    return (
      <span aria-label={ariaLabel} aria-disabled className={cn(base, cls)}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={ariaLabel} aria-current={active ? "page" : undefined} className={cn(base, cls)}>
      {children}
    </Link>
  );
}
