import { getConfig, getSecret } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * Adapter WhatsApp provider-agnostic.
 *
 * Pilih provider via config `notifications.whatsapp.provider`:
 *   - "none"   (default) → no-op, log saja (return ok:false "not configured")
 *   - "fonnte" → Fonnte (gateway lokal, butuh secret notifications.whatsapp.fonnte_token)
 *   - "meta"   → WhatsApp Cloud API resmi (butuh secret + phone_number_id config)
 *
 * Kredensial SELALU dari app_secrets (getSecret), JANGAN hardcode.
 * Semua adapter soft-fail: kalau secret/config kurang → return ok:false, tidak throw.
 */

export interface WhatsAppSendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface WhatsAppAdapter {
  readonly name: string;
  sendText(to: string, message: string): Promise<WhatsAppSendResult>;
}

/** Normalisasi nomor ke format internasional tanpa "+" (mis. 08xxx → 628xxx). */
export function normalizePhone(raw: string): string {
  let p = raw.replace(/[^0-9+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = `62${p.slice(1)}`;
  return p;
}

const noopAdapter: WhatsAppAdapter = {
  name: "none",
  async sendText(to) {
    logger.warn({ to: to.slice(0, 5) + "***" }, "WhatsApp provider belum dikonfigurasi (none) — pesan dilewati");
    return { ok: false, error: "WhatsApp provider belum dikonfigurasi" };
  },
};

/** Fonnte — POST https://api.fonnte.com/send, header Authorization: <token>. */
function fonnteAdapter(): WhatsAppAdapter {
  return {
    name: "fonnte",
    async sendText(to, message) {
      let token: string;
      try {
        token = await getSecret("notifications.whatsapp.fonnte_token");
      } catch {
        return { ok: false, error: "Fonnte token belum di-set" };
      }
      try {
        const res = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: { Authorization: token, "Content-Type": "application/json" },
          body: JSON.stringify({ target: normalizePhone(to), message }),
        });
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok || json?.status === false) {
          return { ok: false, error: String(json?.reason ?? `HTTP ${res.status}`) };
        }
        const id = Array.isArray(json?.id) ? String(json.id[0]) : json?.id ? String(json.id) : undefined;
        return { ok: true, providerMessageId: id };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "network error" };
      }
    },
  };
}

/** Meta WhatsApp Cloud API — resmi. Butuh token + phone_number_id. */
function metaAdapter(): WhatsAppAdapter {
  return {
    name: "meta",
    async sendText(to, message) {
      let token: string;
      try {
        token = await getSecret("notifications.whatsapp.meta_token");
      } catch {
        return { ok: false, error: "Meta WhatsApp token belum di-set" };
      }
      const phoneNumberId = await getConfig<string>("notifications.whatsapp.meta_phone_number_id", {
        defaultValue: "",
      });
      if (!phoneNumberId) return { ok: false, error: "meta_phone_number_id belum di-set" };
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: normalizePhone(to),
            type: "text",
            text: { body: message },
          }),
        });
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          const e = json?.error as { message?: string } | undefined;
          return { ok: false, error: e?.message ?? `HTTP ${res.status}` };
        }
        const msgs = json?.messages as Array<{ id?: string }> | undefined;
        return { ok: true, providerMessageId: msgs?.[0]?.id };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "network error" };
      }
    },
  };
}

export async function getWhatsAppAdapter(): Promise<WhatsAppAdapter> {
  const provider = await getConfig<string>("notifications.whatsapp.provider", {
    defaultValue: "none",
  });
  switch (provider) {
    case "fonnte":
      return fonnteAdapter();
    case "meta":
      return metaAdapter();
    default:
      return noopAdapter;
  }
}
