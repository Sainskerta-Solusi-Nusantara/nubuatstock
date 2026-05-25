import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { BreadcrumbItem } from "@/lib/types/ui";

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (!items.length) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
    >
      <ol className="flex items-center gap-1">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded px-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn("px-1", isLast && "font-medium text-foreground")}
                >
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="size-3" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
