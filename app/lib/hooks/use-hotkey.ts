"use client";

import { useEffect } from "react";

interface UseHotkeyOptions {
  /** Cegah default action browser (mis. Cmd+K open browser search). */
  preventDefault?: boolean;
  /** Aktif hanya bila true. */
  enabled?: boolean;
}

/**
 * Hotkey hook minimalis. Kombinasi pakai notasi `mod+k`, `shift+/`, `escape`.
 * `mod` = metaKey di macOS, ctrlKey di Windows/Linux.
 *
 * Tidak menelan event saat target berasal dari kontrol input kecuali user
 * tujukan hotkey memang untuk override (mis. Cmd+K should still open palette).
 */
export function useHotkey(
  combo: string,
  handler: (e: KeyboardEvent) => void,
  options: UseHotkeyOptions = {},
): void {
  const { preventDefault = true, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const tokens = combo
      .toLowerCase()
      .split("+")
      .map((s) => s.trim());
    const wantMod = tokens.includes("mod") || tokens.includes("cmd") || tokens.includes("ctrl");
    const wantShift = tokens.includes("shift");
    const wantAlt = tokens.includes("alt") || tokens.includes("option");
    const key = tokens.find(
      (t) => !["mod", "cmd", "ctrl", "shift", "alt", "option"].includes(t),
    );

    if (!key) return;

    const onKey = (e: KeyboardEvent) => {
      const isMac =
        typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad/.test(navigator.platform);
      const modPressed = isMac ? e.metaKey : e.ctrlKey;

      if (wantMod !== modPressed) return;
      if (wantShift !== e.shiftKey) return;
      if (wantAlt !== e.altKey) return;
      if (e.key.toLowerCase() !== key) return;

      if (preventDefault) e.preventDefault();
      handler(e);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo, handler, preventDefault, enabled]);
}
