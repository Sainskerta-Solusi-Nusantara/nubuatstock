"use client";

import * as React from "react";

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const Ctx = React.createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const toggle = React.useCallback(() => setOpen((p) => !p), []);
  const value = React.useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCommandPalette(): CommandPaletteContextValue {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useCommandPalette must be inside CommandPaletteProvider");
  return v;
}
