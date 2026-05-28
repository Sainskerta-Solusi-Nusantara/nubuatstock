"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Search box server-side friendly: submit men-set query param `?q=` lewat
 * navigasi (router.push), bukan filter di client. Ini SEO-friendly karena
 * hasilnya tetap di-render di server dengan URL yang shareable & crawlable.
 */
export function GlossarySearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/glossary?q=${encodeURIComponent(q)}` : "/glossary");
  }

  function clear() {
    setValue("");
    router.push("/glossary");
  }

  return (
    <form onSubmit={submit} role="search" className="relative w-full max-w-xl">
      <label htmlFor="glossary-search" className="sr-only">
        Cari istilah saham
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        id="glossary-search"
        name="q"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cari istilah, mis. ARA, dividen, RSI..."
        autoComplete="off"
        className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-24 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {value && (
          <button
            type="button"
            onClick={clear}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Reset
          </button>
        )}
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
        >
          Cari
        </button>
      </div>
    </form>
  );
}
