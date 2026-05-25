"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { BillingCycle } from "@/lib/types/billing";

interface CycleToggleProps {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}

export function CycleToggle({ value, onChange }: CycleToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-muted p-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "rounded-md",
          value === "monthly" && "bg-background shadow",
        )}
        onClick={() => onChange("monthly")}
      >
        Bulanan
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "rounded-md",
          value === "annual" && "bg-background shadow",
        )}
        onClick={() => onChange("annual")}
      >
        Tahunan
        <span className="ml-1 text-xs text-primary">hemat ~17%</span>
      </Button>
    </div>
  );
}
