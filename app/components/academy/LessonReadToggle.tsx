"use client";

import * as React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useLessonRead } from "@/components/academy/useAcademyProgress";

/**
 * Tombol "Tandai selesai" untuk satu lesson. Status persist di localStorage.
 */
export function LessonReadToggle({ slug }: { slug: string }) {
  const { read, toggle } = useLessonRead(slug);

  return (
    <Button
      type="button"
      variant={read ? "bull" : "outline"}
      size="sm"
      onClick={toggle}
      className={cn(read && "border-transparent")}
    >
      {read ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      {read ? "Selesai dibaca" : "Tandai selesai"}
    </Button>
  );
}
