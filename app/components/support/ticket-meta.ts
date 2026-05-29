import type { BadgeProps } from "@/components/ui/badge";

type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_user"
  | "resolved"
  | "closed";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/** Label & badge variant per status tiket (Bahasa Indonesia). */
export const STATUS_META: Record<
  TicketStatus,
  { label: string; variant: BadgeVariant }
> = {
  open: { label: "Terbuka", variant: "default" },
  in_progress: { label: "Diproses", variant: "secondary" },
  waiting_user: { label: "Nunggu balasan kamu", variant: "bull" },
  resolved: { label: "Selesai", variant: "neutral" },
  closed: { label: "Ditutup", variant: "neutral" },
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug / error",
  feature_request: "Usul fitur",
  account: "Akun",
  billing: "Tagihan / langganan",
  trading: "Trading / data",
  other: "Lainnya",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
