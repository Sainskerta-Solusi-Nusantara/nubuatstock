import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { headers } from "next/headers";
import { DELETION_GRACE_DAYS } from "@/lib/account/delete";
import { getSession } from "@/lib/auth";
import { DiagSession } from "@/components/DiagSession";
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
  // getSession dibungkus React cache() → aman dipanggil lagi di sini (dedupe
  // dengan layout, satu eksekusi per request). Data per-request, TIDAK di-cache
  // lintas user (beda dengan endpoint GET yang sempat bocorkan data user lain).
  const session = await getSession();
  const u = (session?.user ?? {}) as { name?: string; email?: string };
  const hdrs = await headers();
  const cookieHeader = hdrs.get("cookie") ?? "";
  const rscCookieNames = cookieHeader
    .split(";")
    .map((c) => c.split("=")[0]?.trim())
    .filter(Boolean);
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8 sm:py-10">
      <div className="rounded-md border border-amber-500 bg-amber-50 p-3 text-[11px] font-mono text-amber-900">
        <div className="font-semibold">DIAG SEMENTARA (akan dihapus)</div>
        <div className="break-all">
          RSC getSession: hasSession={String(!!session)} · email={u.email ?? "-"} ·
          cookies[{rscCookieNames.length}]={rscCookieNames.join(", ") || "(kosong)"}
        </div>
        <DiagSession />
      </div>
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
