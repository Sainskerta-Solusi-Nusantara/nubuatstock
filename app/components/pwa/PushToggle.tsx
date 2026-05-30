"use client";

import * as React from "react";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

/** base64url → Uint8Array (untuk applicationServerKey). */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "loading" | "unsupported" | "off" | "on" | "denied";

export function PushToggle() {
  const [state, setState] = React.useState<State>("loading");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const keyRes = await fetch("/api/push/vapid-public-key");
      const keyJson = await keyRes.json();
      const vapidKey = keyJson?.data?.key ?? keyJson?.key;
      if (!vapidKey) {
        toast.error("Push belum dikonfigurasi admin (VAPID key belum di-set).");
        setBusy(false);
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan langganan");
      setState("on");
      toast.success("Notifikasi push browser aktif.");
    } catch (err) {
      toast.error((err as Error).message || "Gagal mengaktifkan push.");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Notifikasi push dimatikan.");
    } catch (err) {
      toast.error((err as Error).message || "Gagal mematikan push.");
    }
    setBusy(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-4" /> Push Browser
        </CardTitle>
        <CardDescription>
          Terima alert real-time di browser/HP walau aplikasi tertutup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state === "unsupported" ? (
          <p className="text-sm text-muted-foreground">
            Browser kamu tidak mendukung notifikasi push.
          </p>
        ) : state === "denied" ? (
          <p className="text-sm text-muted-foreground">
            Izin notifikasi diblokir. Aktifkan lewat pengaturan situs di browser kamu, lalu
            muat ulang halaman ini.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">
              {state === "on" ? "Push aktif di perangkat ini" : "Aktifkan push di perangkat ini"}
            </span>
            <Switch
              checked={state === "on"}
              disabled={busy || state === "loading"}
              onCheckedChange={(v) => (v ? enable() : disable())}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
