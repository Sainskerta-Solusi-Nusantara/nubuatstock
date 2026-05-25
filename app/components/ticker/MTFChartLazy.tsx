import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load TradingView chart (~45KB) — only load saat user hit Overview/Technical tab.
export const MTFChart = dynamic(
  () => import("@/components/chart/MTFChart").then((m) => ({ default: m.MTFChart })),
  {
    loading: () => <Skeleton className="h-[420px] w-full" />,
  },
);
