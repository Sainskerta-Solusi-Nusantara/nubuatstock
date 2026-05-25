import type { ReactNode } from "react";
import Link from "next/link";
import { getAppName } from "@/lib/auth/config";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const appName = await getAppName();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 py-10">
      <Link
        href="/"
        className="text-2xl font-semibold tracking-tight mb-8 text-neutral-900"
      >
        {appName}
      </Link>
      <main className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-sm p-8">
        {children}
      </main>
      <p className="mt-6 text-xs text-neutral-500 text-center max-w-md">
        Dengan melanjutkan, Anda menyetujui Ketentuan Layanan & Kebijakan Privasi {appName}.
      </p>
    </div>
  );
}
