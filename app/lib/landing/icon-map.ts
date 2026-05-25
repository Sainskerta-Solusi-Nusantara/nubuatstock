import {
  TrendingDown,
  AlertTriangle,
  Clock,
  HelpCircle,
  LineChart,
  Layers,
  Brain,
  FileSearch,
  Command,
  Bell,
  Eye,
  Wallet,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapping `id` di landing config → komponen Lucide icon.
 *
 * Admin/Superadmin edit text via CMS tapi TIDAK edit icon. Icon-id pairing
 * dijaga di sini untuk integritas visual. Untuk tambah icon baru, edit file ini.
 */

const ICON_MAP: Record<string, LucideIcon> = {
  // Painpoints
  fomo: TrendingDown,
  sl: AlertTriangle,
  cutloss: Clock,
  noplan: HelpCircle,

  // Features
  multilens: Layers,
  picks: LineChart,
  ai: Brain,
  research: FileSearch,
  bandar: Eye,
  cmd: Command,
  alerts: Bell,
  paper: Wallet,

  // Generic
  sparkle: Sparkles,
};

export function getIcon(id: string): LucideIcon {
  return ICON_MAP[id] ?? HelpCircle;
}
