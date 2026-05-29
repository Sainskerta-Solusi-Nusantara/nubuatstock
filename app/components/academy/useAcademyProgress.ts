"use client";

import * as React from "react";
import { ACADEMY_PROGRESS_PREFIX } from "@/lib/academy/content";

/**
 * Progress "sudah dibaca" Academy disimpan di localStorage, satu key per lesson:
 *   nubuat-academy-read:<lessonSlug> = "1"
 *
 * Disengaja client-only & lightweight (MVP). Saat butuh sinkron lintas device,
 * progress ini bisa dipindah ke DB lewat API tanpa mengubah bentuk key.
 *
 * `bump` (dari event custom) memastikan list page & lesson page tetap sinkron
 * dalam satu tab tanpa reload, ditambah `storage` event untuk antar-tab.
 */

const CHANGE_EVENT = "nubuat-academy-progress-change";

function readSet(slugs: readonly string[]): Set<string> {
  const done = new Set<string>();
  if (typeof window === "undefined") return done;
  for (const slug of slugs) {
    try {
      if (window.localStorage.getItem(ACADEMY_PROGRESS_PREFIX + slug) === "1") {
        done.add(slug);
      }
    } catch {
      // localStorage bisa di-block (private mode); abaikan.
    }
  }
  return done;
}

/** Tandai/lepas status "sudah dibaca" sebuah lesson + broadcast perubahan. */
export function setLessonRead(slug: string, read: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const key = ACADEMY_PROGRESS_PREFIX + slug;
    if (read) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // abaikan
  }
}

/** Set slug lesson yang sudah dibaca (reaktif terhadap perubahan). */
export function useReadLessons(slugs: readonly string[]): Set<string> {
  const [done, setDone] = React.useState<Set<string>>(() => new Set());

  // Stabilkan dependency dari array slug.
  const key = slugs.join(",");

  React.useEffect(() => {
    const refresh = () => setDone(readSet(slugs));
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return done;
}

/** Status baca + toggle untuk satu lesson. */
export function useLessonRead(slug: string): { read: boolean; toggle: () => void } {
  const set = useReadLessons(React.useMemo(() => [slug], [slug]));
  const read = set.has(slug);
  const toggle = React.useCallback(() => setLessonRead(slug, !read), [slug, read]);
  return { read, toggle };
}
