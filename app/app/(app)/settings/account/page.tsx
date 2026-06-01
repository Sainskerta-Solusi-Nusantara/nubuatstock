import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { DELETION_GRACE_DAYS } from "@/lib/account/delete";
import {
  DeleteAccountButton,
  ExportDataButton,
  ProfileForm,
  ChangePasswordForm,
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
  // Halaman ini di bawah (app) layout yang SUDAH menjamin sesi. JANGAN redirect
  // ke /login dari sini — getSession di RSC sesekali bisa null (race cookie-cache)
  // sehingga user yang sebenarnya login malah "terlempar" ke halaman login.
  // Kalau null, tampilkan prompt muat ulang yang aman.
  const session = await getSession();
  if (!session) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Sesi belum termuat</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Coba muat ulang halaman ini. Kamu tidak perlu login lagi.
        </p>
        <a
          href="/settings/account"
          className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Muat ulang
        </a>
      </div>
    );
  }
  const u = session.user as { name?: string; email?: string };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold sm:text-3xl">Profil &amp; Akun</h1>
        <p className="text-muted-foreground">
          Kelola profil, keamanan, dan data pribadi kamu.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Ubah nama tampilan kamu di Nubuat.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm initialName={u.name ?? ""} email={u.email ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keamanan — Ubah password</CardTitle>
          <CardDescription>
            Ganti password akun kamu. Demi keamanan, sesi lain akan otomatis dikeluarkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

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
