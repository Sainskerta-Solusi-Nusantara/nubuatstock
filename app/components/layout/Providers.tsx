"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";

/**
 * Client providers untuk shell `(app)`.
 *
 * - QueryClient: stale 60s, retry 1, refetchOnWindowFocus matikan default
 *   (penghematan kuota & quota AI/market data).
 * - NuqsAdapter: URL state untuk tab, timeframe, dll.
 * - TooltipProvider: agar Radix tooltips share single delay duration.
 * - Toaster: sonner.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <NuqsAdapter>
      <QueryClientProvider client={client}>
        <TooltipProvider delayDuration={150}>
          {children}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
