"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      type="button"
      className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent print:hidden"
    >
      <Printer className="mr-2 h-3.5 w-3.5" />
      {label}
    </button>
  );
}
