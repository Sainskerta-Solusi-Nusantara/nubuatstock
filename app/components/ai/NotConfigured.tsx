import Link from "next/link";

/**
 * Empty state ketika AI API key belum di-set di app_secrets.
 * Dipakai oleh page server component ketika ConfigurationError tertangkap.
 */
export function NotConfigured({ providerKey }: { providerKey?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        AI belum dikonfigurasi
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Administrator perlu mengatur API key AI di halaman konfigurasi.
        {providerKey && (
          <>
            <br />
            <code className="mt-2 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
              {providerKey}
            </code>
          </>
        )}
      </p>
      <Link
        href="/admin/config"
        className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Buka /admin/config
      </Link>
    </div>
  );
}
