import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { DELETION_GRACE_DAYS } from "@/lib/account/delete";
import {
  DeleteAccountButton,
  ExportDataButton,
} from "./account-actions";

/**
 * Pengaturan Akun & Privasi (`/settings/account`).
 *
 * Server component. Memuat kontrol kepatuhan UU PDP:
 *  - Ekspor data (hak akses & portabilitas)
 *  - Hapus akun (hak penghapusan, soft-delete + grace 30 hari)
 */
export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    redirect("/login?next=/settings/account");
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Akun &amp; Privasi</h1>
        <p className="text-muted-foreground">
          Kelola data pribadi kamu sesuai UU Perlindungan Data Pribadi.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Ekspor data saya</CardTitle>
          <CardDescription>
            Unduh salinan seluruh data kamu (profil, watchlist, portofolio,
            langganan, percakapan AI, dan lainnya) dalam format JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportDataButton />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Hapus akun</CardTitle>
          <CardDescription>
            Akun akan dinonaktifkan dan dijadwalkan untuk dihapus permanen setelah{" "}
            {DELETION_GRACE_DAYS} hari. Kamu dapat membatalkan dengan login kembali
            selama masa tenggang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  );
}
