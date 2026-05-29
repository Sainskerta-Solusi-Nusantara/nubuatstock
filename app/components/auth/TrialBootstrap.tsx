"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Client component yang otomatis call /api/billing/start-trial setelah signup
 * sukses jika URL param `trial=pro` ada (atau tier lain).
 *
 * Dipasang di signup success page (atau onboarding) untuk activate trial 3 hari.
 * Idempotent di backend — aman kalau dipanggil 2x.
 */
export function TrialBootstrap({ tierKode }: { tierKode: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    fetch("/api/billing/start-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierKode }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          if (data.data?.alreadyOnTier) {
            // user sudah pada tier paid/trial — no-op
            return;
          }
          toast.success(`Trial ${tierKode} aktif untuk ${data.data?.durationDays ?? 3} hari! 🎉`);
        }
      })
      .catch(() => {
        // Silent failure — trial bisa dicoba lagi manual dari /subscription
      });
  }, [tierKode]);

  return null;
}
