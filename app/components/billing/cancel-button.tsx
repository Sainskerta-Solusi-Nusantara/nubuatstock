"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CancelButton({ disabled }: { disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    if (!confirm("Yakin ingin membatalkan? Akses tetap berlaku sampai akhir periode.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ immediate: false }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json?.error?.message ?? "Gagal membatalkan.");
        return;
      }
      toast.success("Paket akan berakhir di akhir periode billing.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleCancel} disabled={disabled || loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Batalkan Paket
    </Button>
  );
}
