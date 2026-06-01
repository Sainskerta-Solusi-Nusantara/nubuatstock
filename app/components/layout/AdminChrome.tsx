"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/config", label: "Config" },
  { href: "/admin/secrets", label: "Secrets" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/feature-flags", label: "Feature Flags" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/jobs", label: "Jobs Queue" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/ai-prompts", label: "AI Prompts" },
  { href: "/admin/glossary", label: "Glossary" },
  { href: "/admin/ksei-ownership", label: "KSEI Ownership" },
];

/**
 * Chrome admin (banner + sidebar kiri). HANYA untuk /admin/*.
 * Di /superadmin/* TIDAK ditampilkan karena layout superadmin sudah punya
 * sidebar sendiri (menghindari sidebar dobel).
 */
export function AdminChrome({
  appName,
  email,
  children,
}: {
  appName: string;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/superadmin")) return <>{children}</>;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="bg-emerald-600 text-white text-xs font-medium px-4 py-2 text-center border-b border-emerald-700">
        ADMIN MODE — Perubahan config berdampak ke seluruh user. Selalu review diff sebelum save.
      </div>
      <div className="flex">
        <aside className="w-64 min-h-[calc(100vh-32px)] bg-white border-r border-neutral-200 p-4 sticky top-0">
          <Link href="/admin" className="block text-lg font-semibold tracking-tight mb-6">
            {appName} <span className="text-xs text-neutral-500">/ admin</span>
          </Link>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-md hover:bg-neutral-100 text-sm text-neutral-700"
              >
                <span className="text-neutral-400 mr-2">•</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 pt-4 border-t border-neutral-200 text-xs text-neutral-500">
            Signed in sebagai
            <div className="font-medium text-neutral-700 truncate">{email}</div>
          </div>
          <Link href="/dashboard" className="mt-4 block text-xs text-neutral-500 hover:text-neutral-700 underline">
            ← Kembali ke app
          </Link>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
