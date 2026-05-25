"use client";

import { useEffect, useRef, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { cn } from "@/lib/utils/cn";

interface SearchResult {
  kode: string;
  namaPerusahaan: string;
  sectorKode?: string | null;
}

interface AddTickerComboboxProps {
  onPick: (companyKode: string) => Promise<void> | void;
  disabled?: boolean;
}

/**
 * Menggunakan endpoint `/api/companies/search` (Agent 2). Saat endpoint belum ready,
 * combobox tetap render dengan empty state actionable (tidak ada fake data).
 */
export function AddTickerCombobox({ onPick, disabled }: AddTickerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    let aborted = false;
    if (!query || query.length < 1) {
      setResults([]);
      setError(null);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/companies/search?q=${encodeURIComponent(query)}&limit=10`,
        );
        if (!res.ok) {
          if (res.status === 404) {
            setError("Pencarian belum tersedia. Hubungi admin.");
          } else {
            setError("Pencarian gagal");
          }
          setResults([]);
          return;
        }
        const json = (await res.json()) as { ok: boolean; data?: { items?: SearchResult[] } };
        if (!aborted) setResults(json.data?.items ?? []);
      } catch {
        if (!aborted) {
          setError("Pencarian gagal");
          setResults([]);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }, 200);
    return () => {
      aborted = true;
      clearTimeout(handle);
    };
  }, [query]);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm",
          "hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed w-full",
        )}
      >
        <span className="text-muted-foreground">+ Tambah emiten...</span>
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <Command label="Cari emiten" shouldFilter={false} className="overflow-hidden rounded-md">
            <CommandInput
              autoFocus
              placeholder="Ketik kode atau nama emiten..."
              value={query}
              onValueChange={setQuery}
              className="w-full px-3 py-2 text-sm border-b border-border bg-transparent outline-none"
            />
            <CommandList className="max-h-72 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Mencari...</div>
              ) : null}
              {error ? (
                <div className="px-3 py-2 text-xs text-bear">{error}</div>
              ) : null}
              {!loading && !error && query && results.length === 0 ? (
                <CommandEmpty className="px-3 py-2 text-xs text-muted-foreground">
                  Tidak ditemukan.
                </CommandEmpty>
              ) : null}
              {results.length > 0 ? (
                <CommandGroup>
                  {results.map((r) => (
                    <CommandItem
                      key={r.kode}
                      value={r.kode}
                      onSelect={async () => {
                        setOpen(false);
                        setQuery("");
                        await onPick(r.kode);
                      }}
                      className="px-3 py-2 cursor-pointer hover:bg-accent flex items-center gap-3"
                    >
                      <span className="font-mono font-semibold text-sm">{r.kode}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {r.namaPerusahaan}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </div>
      ) : null}
    </div>
  );
}
