"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  userId: string;
  currentRole: "user" | "admin";
  isLocked: boolean;
}

export function UserActions({ userId, currentRole, isLocked }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  async function call(label: string, path: string, init: RequestInit, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    setBusy(label);
    try {
      const res = await fetch(path, init);
      const j = (await res.json()) as { ok: boolean; error?: { message?: string } };
      if (!res.ok || !j.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
      toast.success(`${label} berhasil.`);
      if (typeof window !== "undefined") window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Gagal ${label}`);
    } finally {
      setBusy(null);
    }
  }

  async function suspend() {
    const reason = prompt("Alasan suspend?");
    if (!reason) return;
    await call(
      "Suspend",
      `/api/admin/users/${userId}/suspend`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      },
      "Suspend user ini? Mereka tidak akan bisa login sampai unsuspend.",
    );
  }

  async function unsuspend() {
    await call(
      "Unsuspend",
      `/api/admin/users/${userId}/suspend`,
      { method: "DELETE" },
      "Unsuspend user ini?",
    );
  }

  async function promote() {
    const next = currentRole === "admin" ? "user" : "admin";
    const reason = prompt(`Alasan ubah role ke ${next}?`);
    if (!reason) return;
    await call(
      "Role change",
      `/api/admin/users/${userId}/promote-role`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next, reason }),
      },
      `Ubah role user ini menjadi ${next}?`,
    );
  }

  async function forceLogout() {
    await call(
      "Force logout",
      `/api/admin/users/${userId}/force-logout`,
      { method: "POST" },
      "Force logout semua session user ini?",
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isLocked ? (
        <button
          type="button"
          disabled={busy !== null}
          onClick={unsuspend}
          className="text-sm px-3 py-1.5 rounded-md border border-green-300 text-green-700 hover:bg-green-50"
        >
          Unsuspend
        </button>
      ) : (
        <button
          type="button"
          disabled={busy !== null}
          onClick={suspend}
          className="text-sm px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50"
        >
          Suspend
        </button>
      )}
      <button
        type="button"
        disabled={busy !== null}
        onClick={promote}
        className="text-sm px-3 py-1.5 rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50"
      >
        {currentRole === "admin" ? "Demote ke user" : "Promote ke admin"}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={forceLogout}
        className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50"
      >
        Force logout
      </button>
    </div>
  );
}
