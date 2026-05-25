"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

/**
 * Toast wrapper berbasis `sonner`. Tema dark-by-default sesuai shell.
 * Pakai `toast.success(...)`, `toast.error(...)`, dst.
 */
function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      theme="dark"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
    />
  );
}

export { Toaster, toast };
