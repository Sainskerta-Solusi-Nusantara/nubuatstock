"use client";

import { useEffect, useState } from "react";

// Minimal, dependency-free "Install App" prompt. Listens for the Chromium
// `beforeinstallprompt` event and surfaces a button only when the browser
// considers the app installable and it is not already running standalone.
// Safe to render anywhere; renders nothing when install is unavailable.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed / running as a standalone PWA — nothing to offer.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari exposes this non-standard flag.
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  const handleInstall = async () => {
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } finally {
      setDeferred(null);
    }
  };

  return (
    <button
      type="button"
      onClick={handleInstall}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted"
      }
    >
      Install App
    </button>
  );
}

export default InstallAppButton;
