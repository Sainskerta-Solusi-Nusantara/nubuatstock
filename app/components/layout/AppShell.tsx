import * as React from "react";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";
import { Providers } from "./Providers";
import { CommandPaletteProvider } from "@/components/navigation/CommandPaletteProvider";
import { CommandPalette } from "@/components/navigation/CommandPalette";
import { resolveServerLocale } from "@/lib/i18n/request";
import type { SessionUser } from "@/lib/types/auth";
import type { UserRole } from "@/lib/auth/roles";

interface AppShellProps {
  user: SessionUser;
  /** Tier slug aktif (free/starter/pro/...). Null saat belum di-resolve. */
  tier: string | null;
  children: React.ReactNode;
}

/**
 * App Shell server-side: composes Providers (client) → Sidebar + Header + main + MobileNav.
 * Provider tree:
 *   Providers
 *     └ CommandPaletteProvider
 *        ├ Sidebar (desktop)
 *        ├ Header (mobile + desktop top bar)
 *        ├ <main>
 *        ├ MobileNav (mobile bottom)
 *        ├ Footer
 *        └ CommandPalette (Cmd+K)
 */
export async function AppShell({ user, tier, children }: AppShellProps) {
  const locale = await resolveServerLocale();
  // Better-Auth infers user.role sebagai literal "user" (dari defaultValue di
  // lib/auth/server.ts). Cast ke UserRole 3-tier (lib/auth/roles.ts) supaya
  // perbandingan dengan "admin"/"superadmin" tidak dianggap no-overlap.
  const role = user.role as UserRole;
  return (
    <Providers>
      <CommandPaletteProvider>
        <div className="flex min-h-[100dvh] bg-background text-foreground">
          <Sidebar
            isAdmin={role === "admin" || role === "superadmin"}
            isSuperadmin={role === "superadmin"}
            tier={tier}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header
              user={{
                name: user.name,
                email: user.email,
                role: user.role,
                image: user.image,
              }}
              locale={locale}
            />
            <main
              id="main"
              className="flex-1 px-4 pb-20 pt-4 md:px-6 md:pb-6"
              tabIndex={-1}
            >
              {children}
            </main>
            <Footer />
          </div>
        </div>
        <MobileNav />
        <CommandPalette />
      </CommandPaletteProvider>
    </Providers>
  );
}
