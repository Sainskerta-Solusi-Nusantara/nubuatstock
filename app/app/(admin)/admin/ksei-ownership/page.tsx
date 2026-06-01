import { desc } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { kseiOwnershipImport } from "@/db/schema/ksei";
import { KSEI_SOURCE_URL } from "@/lib/ksei/service";
import { KseiUploader } from "./uploader";

export const dynamic = "force-dynamic";

export default async function KseiOwnershipAdminPage() {
  await requireAdmin();
  const imports = await db
    .select()
    .from(kseiOwnershipImport)
    .orderBy(desc(kseiOwnershipImport.posDate))
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KSEI — Komposisi Kepemilikan</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Upload file <strong>BalancePos</strong> dari KSEI untuk memperbarui data komposisi
          kepemilikan (Lokal vs Asing per tipe investor) yang tampil di menu Analisis →
          Kepemilikan (KSEI).
        </p>
        <p className="mt-1 text-sm">
          Sumber resmi:{" "}
          <a href={KSEI_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
            {KSEI_SOURCE_URL}
          </a>{" "}
          — unduh file lalu upload di sini saat ada posisi baru.
        </p>
      </div>

      <KseiUploader />

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Riwayat upload
        </h2>
        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-2">Tanggal posisi</th>
                <th className="px-4 py-2 text-right">Jumlah emiten</th>
                <th className="px-4 py-2">File</th>
                <th className="px-4 py-2">Di-update</th>
              </tr>
            </thead>
            <tbody>
              {imports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                    Belum ada data. Upload file BalancePos pertama.
                  </td>
                </tr>
              ) : (
                imports.map((im) => (
                  <tr key={im.id} className="border-t border-neutral-100">
                    <td className="px-4 py-2 font-medium">{im.posDate}</td>
                    <td className="px-4 py-2 text-right font-mono">{im.rowCount.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-2 text-neutral-500">{im.fileName ?? "—"}</td>
                    <td className="px-4 py-2 text-neutral-500">
                      {new Date(im.updatedAt).toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
