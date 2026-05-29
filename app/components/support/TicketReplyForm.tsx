"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

interface TicketReplyFormProps {
  ticketId: string;
  /** Tiket yang sudah resolved/closed disable reply. */
  disabled?: boolean;
}

/**
 * Reply box untuk thread tiket support. POST ke /api/support/tickets/[id].
 */
export function TicketReplyForm({ ticketId, disabled }: TicketReplyFormProps) {
  const router = useRouter();
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 1) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; error?: { message?: string } }
        | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.error?.message ?? "Gagal mengirim balasan.");
        return;
      }
      setMessage("");
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  if (disabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Tiket ini sudah ditutup. Buat tiket baru kalau masih butuh bantuan.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tulis balasan kamu..."
        rows={3}
        maxLength={5000}
        required
      />
      <Button type="submit" size="sm" disabled={submitting || message.trim().length === 0}>
        {submitting ? "Mengirim..." : "Kirim balasan"}
      </Button>
    </form>
  );
}
