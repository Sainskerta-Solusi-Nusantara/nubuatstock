"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "nubuat-theme";

type Mode = "light" | "dark" | "system";
type Resolved = "light" | "dark";

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStored(): Mode {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  // Hanya 'light'/'dark' yang dianggap pilihan eksplisit tersimpan;
  // selain itu (null / 'system') berarti ikut sistem.
  return v === "light" || v === "dark" ? v : "system";
}

function resolve(mode: Mode): Resolved {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

/** Terapkan tema ke <html>. Persist hanya bila bukan 'system' (default = bersih). */
function apply(mode: Mode) {
  if (typeof document === "undefined") return;
  const resolved = resolve(mode);
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
  if (mode === "system") {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }
}

export function ThemeToggle() {
  // Mulai dari 'system' agar konsisten dengan ThemeScript saat belum ada pilihan.
  const [mode, setMode] = React.useState<Mode>("system");

  React.useEffect(() => {
    setMode(readStored());
  }, []);

  // Saat mode = 'system', ikuti perubahan preferensi OS secara live.
  React.useEffect(() => {
    if (mode !== "system" || typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mode]);

  const cycle = React.useCallback(() => {
    setMode((prev) => {
      // Light → Dark → System → Light
      const next: Mode = prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
      apply(next);
      return next;
    });
  }, []);

  const label =
    mode === "dark"
      ? "Tema: gelap (klik untuk sistem)"
      : mode === "light"
        ? "Tema: terang (klik untuk gelap)"
        : "Tema: ikuti sistem (klik untuk terang)";

  return (
    <Button variant="ghost" size="icon" onClick={cycle} aria-label={label} title={label}>
      {mode === "system" ? (
        <Monitor className="size-4" aria-hidden />
      ) : mode === "dark" ? (
        <Moon className="size-4" aria-hidden />
      ) : (
        <Sun className="size-4" aria-hidden />
      )}
    </Button>
  );
}
