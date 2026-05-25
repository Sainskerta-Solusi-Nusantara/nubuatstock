"use client";

/**
 * Root-level error boundary — overrides the Pages Router `_error` fallback
 * that Next.js otherwise injects (which imports `<Html>` from `next/document`
 * and breaks App Router static generation).
 *
 * Must be a Client Component and must render `<html>` / `<body>` because
 * it replaces the root layout when an error is thrown.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="bg-neutral-50 text-neutral-900">
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <p className="text-sm font-semibold text-neutral-500">Error</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Terjadi kesalahan
            </h1>
            <p className="mt-3 text-sm text-neutral-600">
              {error.message || "Ada masalah saat memuat halaman ini."}
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-neutral-400">Ref: {error.digest}</p>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Coba lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
