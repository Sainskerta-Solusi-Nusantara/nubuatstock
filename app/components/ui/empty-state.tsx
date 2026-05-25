import Link from "next/link";
import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: { href: string; label: string } | null;
  className?: string;
}

/**
 * Reusable empty state per AGENTS.md §4: "tampilkan empty state yang jelas".
 * Tidak ada dummy/mock data.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
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
      {action && (
        <Button asChild size="sm" variant="outline">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}
