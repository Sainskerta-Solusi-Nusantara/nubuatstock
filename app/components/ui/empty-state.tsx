import Link from "next/link";
import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

/**
 * Aksi pada empty state. Dua varian:
 * - Link navigasi: `{ href, label }` (mis. "Cari saham", "Mulai paper trade").
 * - Tombol callback: `{ onClick, label }` (mis. "Coba lagi" / "Refresh" di client page).
 */
export type EmptyStateAction =
  | { href: string; label: string; onClick?: never }
  | { onClick: () => void; label: string; href?: never };

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  /** Aksi utama (primary CTA). */
  action?: EmptyStateAction | null;
  /** Aksi sekunder opsional (mis. link ke Academy / Help). */
  secondaryAction?: EmptyStateAction | null;
  className?: string;
}

/**
 * Reusable empty state per AGENTS.md §4: "tampilkan empty state yang jelas".
 * Tidak ada dummy/mock data — selalu action-oriented dengan CTA biar user
 * tahu langkah berikutnya (menaikkan aktivasi + retensi).
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="rounded-full bg-muted p-3 text-muted-foreground">
        {icon ?? <Inbox className="size-6" aria-hidden="true" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="max-w-sm text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action && <EmptyStateButton action={action} variant="default" />}
          {secondaryAction && (
            <EmptyStateButton action={secondaryAction} variant="outline" />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyStateButton({
  action,
  variant,
}: {
  action: EmptyStateAction;
  variant: "default" | "outline";
}) {
  if ("href" in action && action.href) {
    return (
      <Button asChild size="sm" variant={variant}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  );
}
