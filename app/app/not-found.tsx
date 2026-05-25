import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="text-center max-w-md">
        <p className="text-sm font-semibold text-neutral-500">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          URL yang Anda buka tidak ada atau sudah dipindahkan.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
