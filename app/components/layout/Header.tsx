"use client";

import Link from "next/link";
import * as React from "react";
import { Bell, LineChart, LogOut, Settings, Shield, User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TickerSearch } from "@/components/navigation/TickerSearch";
import { ChangelogBell } from "@/components/changelog/ChangelogBell";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./LocaleSwitcher";
import type { Locale } from "@/lib/i18n/config";

interface HeaderProps {
  user: {
    name: string;
    email: string;
    role: "user" | "admin" | "support" | "analyst";
    image: string | null;
  };
  /** Locale resolved server-side, di-pass dari AppShell (avoid next-intl client hook dependency). */
  locale?: Locale;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Header({ user, locale = "id" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold tracking-tight md:hidden"
      >
        <LineChart className="size-5 text-primary" aria-hidden />
        <span>Nubuat</span>
      </Link>

      <div className="flex-1">
        <div className="hidden sm:block">
          <TickerSearch />
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="ghost" size="icon" aria-label="Notifikasi">
            <Link href="/alerts">
              <Bell className="size-4" aria-hidden />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Alerts</TooltipContent>
      </Tooltip>

      <ChangelogBell />

      <LocaleSwitcher currentLocale={locale as "id" | "en"} />
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full"
            aria-label="Menu pengguna"
          >
            <Avatar className="size-8">
              <AvatarFallback>{initials(user.name || user.email)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {user.name || "Pengguna"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/account">
              <User aria-hidden /> Profil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/subscription">
              <Settings aria-hidden /> Subscription
            </Link>
          </DropdownMenuItem>
          {user.role === "admin" && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield aria-hidden /> Admin Console
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/logout">
              <LogOut aria-hidden /> Logout
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
