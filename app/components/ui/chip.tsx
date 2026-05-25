import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const chipVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        default: "border-border bg-muted text-muted-foreground",
        primary: "border-primary/30 bg-primary/10 text-primary",
        bull: "border-bull/40 bg-bull/10 text-bull",
        bear: "border-bear/40 bg-bear/10 text-bear",
        warning:
          "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export interface ChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof chipVariants> {}

const Chip = React.forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, tone, ...props }, ref) => (
    <span ref={ref} className={cn(chipVariants({ tone }), className)} {...props} />
  ),
);
Chip.displayName = "Chip";

export { Chip, chipVariants };
