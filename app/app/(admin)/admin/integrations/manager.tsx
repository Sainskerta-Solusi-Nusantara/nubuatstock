"use client";

import { useState } from "react";
import { toast } from "sonner";

interface SecretStatus {
  isConfigured: boolean;
  lastRotatedAt: string | null;
  keyVersion: number;
}

interface ConfigEntry {
  id: string | null;
  value: unknown;
}

type SecretKey =
  | "oauth.google.client_id"
  | "oauth.google.client_secret"
  | "email.resend.api_key"
  | "ai.deepseek.api_key";

type ConfigKey = "email.from_address" | "ai.provider" | "ai.deepseek.default_model";

interface Props {
  secrets: Record<SecretKey, SecretStatus>;
  config: Record<ConfigKey, ConfigEntry>;
  redirectUri: string;
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
      ✓ Aktif
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
      ○ Belum aktif
    </span>
  );
}

function SecretMeta({ status }: { status: SecretStatus }) {
  if (!status.isConfigured) {
    return <span className="text-xs text-neutral-400">Belum di-set</span>;
  }
  return (
    <span className="text-xs text-green-600 dark:text-green-400">
      ✓ tersimpan (terenkripsi)
      {status.lastRotatedAt
        ? ` · rotated ${new Date(status.lastRotatedAt).toLocaleString("id-ID")} · v${status.keyVersion}`
        : ""}
    </span>
  );
}

export function IntegrationsManager({ secrets, config, redirectUri }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const google = secrets["oauth.google.client_id"];
  const googleSecret = secrets["oauth.google.client_secret"];
  const googleEnabled = google.isConfigured && googleSecret.isConfigured;

  const resend = secrets["email.resend.api_key"];
  const deepseek = secrets["ai.deepseek.api_key"];

  const fromAddress = config["email.from_address"];
  const aiProvider = config["ai.provider"];
  const aiModel = config["ai.deepseek.default_model"];

  function setDraft(key: string, value: string) {
    setDrafts((d) => ({ ...d, [key]: value }));
  }

  async function setSecret(key: string, label: string) {
    const value = drafts[key]?.trim();
    if (!value) {
      toast.error(`${label} wajib diisi`);
      return;
    }
    if (!confirm(`Simpan / rotate ${label}?`)) return;
    setBusy(key);
    try {
      const res = await fetch(`/api/admin/secrets/${encodeURIComponent(key)}/set`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success(`${label} disimpan.`);
      setDraft(key, "");
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(null);
    }
  }

  async function setConfigValue(entry: ConfigEntry, draftKey: string, label: string) {
    if (!entry.id) {
      toast.error(`Config "${label}" belum ter-seed di DB. Jalankan db:seed dulu.`);
      return;
    }
    const value = drafts[draftKey]?.trim();
    if (!value) {
      toast.error(`${label} wajib diisi`);
      return;
    }
    setBusy(draftKey);
    try {
      const res = await fetch(`/api/admin/config/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success(`${label} disimpan.`);
      setDraft(draftKey, "");
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(null);
    }
  }

  const cardClass =
    "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4";
  const labelClass = "block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1";
  const inputClass =
    "text-sm border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 rounded px-2 py-1.5 w-full font-mono";
  const btnClass =
    "text-sm px-3 py-1.5 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-white disabled:opacity-50 whitespace-nowrap";

  const currentProvider = typeof aiProvider.value === "string" ? aiProvider.value : "deepseek";

  return (
    <div className="grid gap-5 lg:grid-cols-1">
      {/* ===== GOOGLE OAUTH ===== */}
      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Google OAuth</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Login dengan Google. Butuh Client ID + Client Secret dari Google Cloud
              Console (OAuth 2.0 Client).
            </p>
          </div>
          <StatusBadge active={googleEnabled} />
        </div>

        <div className="rounded-md bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 text-xs">
          <div className="text-neutral-500 dark:text-neutral-400">
            Redirect URI yang harus didaftarkan di Google Cloud Console:
          </div>
          <code className="block font-mono text-neutral-800 dark:text-neutral-200 mt-1 break-all">
            {redirectUri}
          </code>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              Client ID <SecretMeta status={google} />
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                autoComplete="off"
                placeholder={google.isConfigured ? "Rotate (input baru)" : "Set Client ID"}
                value={drafts["oauth.google.client_id"] ?? ""}
                onChange={(e) => setDraft("oauth.google.client_id", e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                disabled={busy === "oauth.google.client_id"}
                onClick={() => setSecret("oauth.google.client_id", "Google Client ID")}
                className={btnClass}
              >
                Simpan
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>
              Client Secret <SecretMeta status={googleSecret} />
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                autoComplete="new-password"
                placeholder={googleSecret.isConfigured ? "Rotate (input baru)" : "Set Client Secret"}
                value={drafts["oauth.google.client_secret"] ?? ""}
                onChange={(e) => setDraft("oauth.google.client_secret", e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                disabled={busy === "oauth.google.client_secret"}
                onClick={() => setSecret("oauth.google.client_secret", "Google Client Secret")}
                className={btnClass}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
        {!googleEnabled ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Google login baru aktif setelah Client ID DAN Client Secret keduanya
            tersimpan.
          </p>
        ) : null}
      </section>

      {/* ===== EMAIL (RESEND) ===== */}
      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Email (Resend)</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Pengiriman email transactional (verifikasi, reset password, notifikasi).
            </p>
          </div>
          <StatusBadge active={resend.isConfigured} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>
              API Key <SecretMeta status={resend} />
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                autoComplete="new-password"
                placeholder={resend.isConfigured ? "Rotate (input baru)" : "re_..."}
                value={drafts["email.resend.api_key"] ?? ""}
                onChange={(e) => setDraft("email.resend.api_key", e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                disabled={busy === "email.resend.api_key"}
                onClick={() => setSecret("email.resend.api_key", "Resend API Key")}
                className={btnClass}
              >
                Simpan
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>
              From Address{" "}
              <span className="text-neutral-400 font-normal">
                (saat ini: {typeof fromAddress.value === "string" ? fromAddress.value : "—"})
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nubuat <noreply@nubuat.id>"
                value={drafts["email.from_address"] ?? ""}
                onChange={(e) => setDraft("email.from_address", e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                disabled={busy === "email.from_address"}
                onClick={() => setConfigValue(fromAddress, "email.from_address", "From Address")}
                className={btnClass}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== AI (DEEPSEEK) ===== */}
      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">AI Provider (DeepSeek)</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Penyedia AI untuk Copilot & narasi analisis. Provider aktif:{" "}
              <span className="font-mono">{currentProvider}</span>.
            </p>
          </div>
          <StatusBadge active={deepseek.isConfigured} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              DeepSeek API Key <SecretMeta status={deepseek} />
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                autoComplete="new-password"
                placeholder={deepseek.isConfigured ? "Rotate (input baru)" : "sk-..."}
                value={drafts["ai.deepseek.api_key"] ?? ""}
                onChange={(e) => setDraft("ai.deepseek.api_key", e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                disabled={busy === "ai.deepseek.api_key"}
                onClick={() => setSecret("ai.deepseek.api_key", "DeepSeek API Key")}
                className={btnClass}
              >
                Simpan
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Provider</label>
            <div className="flex gap-2">
              <select
                value={drafts["ai.provider"] ?? currentProvider}
                onChange={(e) => setDraft("ai.provider", e.target.value)}
                className={inputClass}
              >
                <option value="deepseek">deepseek</option>
                <option value="anthropic">anthropic</option>
                <option value="openai">openai</option>
              </select>
              <button
                type="button"
                disabled={busy === "ai.provider"}
                onClick={() => setConfigValue(aiProvider, "ai.provider", "AI Provider")}
                className={btnClass}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Default Model{" "}
            <span className="text-neutral-400 font-normal">
              (saat ini: {typeof aiModel.value === "string" ? aiModel.value : "—"})
            </span>
          </label>
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="deepseek-v4-flash"
              value={drafts["ai.deepseek.default_model"] ?? ""}
              onChange={(e) => setDraft("ai.deepseek.default_model", e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              disabled={busy === "ai.deepseek.default_model"}
              onClick={() => setConfigValue(aiModel, "ai.deepseek.default_model", "Default Model")}
              className={btnClass}
            >
              Simpan
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
