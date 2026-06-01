import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Moderasi chat AI untuk Superadmin.
 *
 * Sumber data: ai_messages (role=user) + ai_conversations + users. Kolom moderasi
 * (injection_risk, flag_reasons, blocked) diisi oleh scanForInjection saat pesan
 * di-persist (lihat lib/ai/chat.ts). Modul ini hanya membaca untuk audit.
 *
 * Semua query best-effort (try/catch di pemanggil) — kalau kolom/tabel belum ada
 * (DB belum migrasi), kembalikan kosong agar halaman tidak 500.
 */

export interface ModerationStats {
  totalMessages: number;
  flaggedTotal: number; // risk != none
  high: number;
  medium: number;
  low: number;
  blocked: number;
  last7dFlagged: number;
}

export interface FlaggedMessageRow {
  id: string;
  conversationId: string;
  content: string;
  injectionRisk: string | null;
  flagReasons: string[];
  blocked: boolean;
  createdAt: Date;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  conversationTitle: string | null;
}

export interface ConversationRow {
  id: string;
  title: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  messageCount: number;
  lastMessageAt: Date | null;
  maxRisk: string | null;
  flaggedCount: number;
}

export interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  toolName: string | null;
  injectionRisk: string | null;
  flagReasons: string[];
  blocked: boolean;
  createdAt: Date;
}

function num(v: unknown): number {
  return Number(v ?? 0);
}

const RISK_RANK: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };

export async function getModerationStats(): Promise<ModerationStats> {
  const rows = (await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE role = 'user') AS total,
      COUNT(*) FILTER (WHERE injection_risk IS NOT NULL AND injection_risk <> 'none') AS flagged,
      COUNT(*) FILTER (WHERE injection_risk = 'high') AS high,
      COUNT(*) FILTER (WHERE injection_risk = 'medium') AS medium,
      COUNT(*) FILTER (WHERE injection_risk = 'low') AS low,
      COUNT(*) FILTER (WHERE blocked = true) AS blocked,
      COUNT(*) FILTER (WHERE injection_risk IS NOT NULL AND injection_risk <> 'none' AND created_at >= NOW() - INTERVAL '7 days') AS last7d
    FROM ai_messages
  `)) as unknown as Array<Record<string, unknown>>;
  const r = rows[0] ?? {};
  return {
    totalMessages: num(r.total),
    flaggedTotal: num(r.flagged),
    high: num(r.high),
    medium: num(r.medium),
    low: num(r.low),
    blocked: num(r.blocked),
    last7dFlagged: num(r.last7d),
  };
}

/**
 * Daftar pesan yang ter-flag (risk != none), terbaru dulu.
 */
export async function listFlaggedMessages(limit = 100): Promise<FlaggedMessageRow[]> {
  const rows = (await db.execute(sql`
    SELECT m.id, m.conversation_id, m.content, m.injection_risk, m.flag_reasons,
           m.blocked, m.created_at,
           c.title AS conversation_title, c.user_id,
           u.email AS user_email, u.name AS user_name
    FROM ai_messages m
    LEFT JOIN ai_conversations c ON c.id = m.conversation_id
    LEFT JOIN users u ON u.id = c.user_id
    WHERE m.injection_risk IS NOT NULL AND m.injection_risk <> 'none'
    ORDER BY m.created_at DESC
    LIMIT ${limit}
  `)) as unknown as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: String(r.id),
    conversationId: String(r.conversation_id),
    content: String(r.content ?? ""),
    injectionRisk: (r.injection_risk as string) ?? null,
    flagReasons: Array.isArray(r.flag_reasons) ? (r.flag_reasons as string[]) : [],
    blocked: r.blocked === true,
    createdAt: new Date(r.created_at as string),
    userId: (r.user_id as string) ?? null,
    userEmail: (r.user_email as string) ?? null,
    userName: (r.user_name as string) ?? null,
    conversationTitle: (r.conversation_title as string) ?? null,
  }));
}

/**
 * Daftar percakapan terbaru + ringkasan risiko (untuk full-access moderation).
 */
export async function listConversations(
  opts: { q?: string; limit?: number } = {},
): Promise<ConversationRow[]> {
  const q = opts.q?.trim() ?? "";
  const limit = opts.limit ?? 100;
  const rows = (await db.execute(sql`
    SELECT c.id, c.title, c.user_id, c.message_count, c.last_message_at,
           u.email AS user_email, u.name AS user_name,
           (SELECT MAX(CASE m.injection_risk
                         WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END)
              FROM ai_messages m WHERE m.conversation_id = c.id) AS max_risk_rank,
           (SELECT COUNT(*) FROM ai_messages m
              WHERE m.conversation_id = c.id AND m.injection_risk IS NOT NULL
                AND m.injection_risk <> 'none') AS flagged_count
    FROM ai_conversations c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE (${q} = '' OR u.email ILIKE '%' || ${q} || '%' OR u.name ILIKE '%' || ${q} || '%' OR c.title ILIKE '%' || ${q} || '%')
    ORDER BY c.last_message_at DESC NULLS LAST
    LIMIT ${limit}
  `)) as unknown as Array<Record<string, unknown>>;
  const rankToRisk = (rank: number): string | null =>
    rank >= 3 ? "high" : rank === 2 ? "medium" : rank === 1 ? "low" : null;
  return rows.map((r) => ({
    id: String(r.id),
    title: (r.title as string) ?? null,
    userId: (r.user_id as string) ?? null,
    userEmail: (r.user_email as string) ?? null,
    userName: (r.user_name as string) ?? null,
    messageCount: num(r.message_count),
    lastMessageAt: r.last_message_at ? new Date(r.last_message_at as string) : null,
    maxRisk: rankToRisk(num(r.max_risk_rank)),
    flaggedCount: num(r.flagged_count),
  }));
}

/**
 * Ambil 1 percakapan + seluruh pesannya (full akses isi chat untuk moderasi).
 */
export async function getConversationDetail(
  conversationId: string,
): Promise<{ conversation: ConversationRow | null; messages: ConversationMessage[] }> {
  const convRows = (await db.execute(sql`
    SELECT c.id, c.title, c.user_id, c.message_count, c.last_message_at,
           u.email AS user_email, u.name AS user_name
    FROM ai_conversations c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.id = ${conversationId}
    LIMIT 1
  `)) as unknown as Array<Record<string, unknown>>;
  const cv = convRows[0];
  const conversation: ConversationRow | null = cv
    ? {
        id: String(cv.id),
        title: (cv.title as string) ?? null,
        userId: (cv.user_id as string) ?? null,
        userEmail: (cv.user_email as string) ?? null,
        userName: (cv.user_name as string) ?? null,
        messageCount: num(cv.message_count),
        lastMessageAt: cv.last_message_at ? new Date(cv.last_message_at as string) : null,
        maxRisk: null,
        flaggedCount: 0,
      }
    : null;

  const msgRows = (await db.execute(sql`
    SELECT id, role, content, tool_name, injection_risk, flag_reasons, blocked, created_at
    FROM ai_messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
    LIMIT 500
  `)) as unknown as Array<Record<string, unknown>>;
  const messages: ConversationMessage[] = msgRows.map((r) => ({
    id: String(r.id),
    role: String(r.role),
    content: String(r.content ?? ""),
    toolName: (r.tool_name as string) ?? null,
    injectionRisk: (r.injection_risk as string) ?? null,
    flagReasons: Array.isArray(r.flag_reasons) ? (r.flag_reasons as string[]) : [],
    blocked: r.blocked === true,
    createdAt: new Date(r.created_at as string),
  }));

  return { conversation, messages };
}

export { RISK_RANK };
