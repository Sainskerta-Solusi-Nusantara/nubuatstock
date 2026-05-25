"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "nubuat-theme";

type Mode = "light" | "dark";

function readStored(): Mode {
  if (typeof window === "undefined") return "dark";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" ? "light" : "dark";
}

function apply(mode: Mode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
  root.style.colorScheme = mode;
  window.localStorage.setItem(STORAGE_KEY, mode);
}

export function ThemeToggle() {
  const [mode, setMode] = React.useState<Mode>("dark");

  React.useEffect(() => {
    setMode(readStored());
  }, []);

  const toggle = React.useCallback(() => {
    setMode((prev) => {
      const next: Mode = prev === "dark" ? "light" : "dark";
      apply(next);
      return next;
    });
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={mode === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
    >
      {mode === "dark" ? (
        <Moon className="size-4" aria-hidden />
      ) : (
        <Sun className="size-4" aria-hidden />
      )}
    </Button>
  );
}
