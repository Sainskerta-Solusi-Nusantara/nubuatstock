"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

type Category =
  | "bug"
  | "feature_request"
  | "account"
  | "billing"
  | "trading"
  | "other";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "bug", label: "Bug / error" },
  { value: "feature_request", label: "Usul fitur" },
  { value: "account", label: "Akun" },
  { value: "billing", label: "Tagihan / langganan" },
  { value: "trading", label: "Trading / data" },
  { value: "other", label: "Lainnya" },
];

/**
 * Form buat tiket support baru. POST ke /api/support/tickets lalu refresh list.
 */
export function NewTicketForm() {
  const router = useRouter();
  const [subject, setSubject] = React.useState("");
  const [category, setCategory] = React.useState<Category>("other");
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 3) {
      toast.error("Subjek minimal 3 karakter.");
      return;
    }
    if (message.trim().length < 10) {
      toast.error("Pesan minimal 10 karakter.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          message: message.trim(),
          contextUrl:
            typeof window !== "undefined" ? window.location.href : null,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: boolean; data?: { id: string }; error?: { message?: string } }
        | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.error?.message ?? "Gagal membuat tiket.");
        return;
      }
      toast.success("Tiket berhasil dibuat.");
      setSubject("");
      setCategory("other");
      setMessage("");
      if (data.data?.id) {
        router.push(`/support/${data.data.id}`);
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ticket-subject">Subjek</Label>
        <Input
          id="ticket-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ringkas masalah/permintaan kamu"
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ticket-category">Kategori</Label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as Category)}
        >
          <SelectTrigger id="ticket-category">
            <SelectValue placeholder="Pilih kategori" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ticket-message">Pesan</Label>
        <Textarea
          id="ticket-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Jelaskan detail masalah atau permintaan kamu..."
          rows={5}
          maxLength={5000}
          required
        />
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Mengirim..." : "Buat tiket"}
      </Button>
    </form>
  );
}
