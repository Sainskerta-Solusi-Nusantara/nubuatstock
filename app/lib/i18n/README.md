# i18n (next-intl)

Modul ini menangani internationalization aplikasi Nubuat. Dua locale didukung:
**`id`** (Bahasa Indonesia, default) dan **`en`** (English).

## Aturan

1. **Tidak boleh hardcode UI text di komponen.** Selalu pakai `useTranslations`
   dari `next-intl`.
2. Translation keys di-namespace: `common`, `auth`, `dashboard`, `watchlist`,
   `picks`, `copilot`, `subscription`, `admin`, `errors`, `finance`.
3. Tambahkan key baru di **kedua** `messages/id.json` dan `messages/en.json`.
   CI akan menolak PR yang menambah key di salah satu saja.
4. Key naming: `snake_case` deskriptif, jangan generik (`button_1` ❌,
   `confirm_remove_cta` ✅).
5. Finance terms gunakan namespace `finance` — istilah teknis IDX
   (cum_date, dpr, papan_utama, dst).

## Penggunaan

### Server Component

```tsx
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("dashboard");
  return <h1>{t("welcome", { name: "Andi" })}</h1>;
}
```

### Client Component

```tsx
"use client";
import { useTranslations } from "next-intl";

export function Greeting({ name }: { name: string }) {
  const t = useTranslations("dashboard");
  return <h1>{t("welcome", { name })}</h1>;
}
```

### Server-side (lib/API)

```ts
import { resolveServerLocale } from "@/lib/i18n";
import { loadMessages } from "@/lib/i18n";

const locale = await resolveServerLocale();
const messages = await loadMessages(locale);
// pakai messages.errors.unauthorized, dst.
```

## Switching locale

Komponen `<LocaleSwitcher currentLocale={...} />` ada di
`components/layout/LocaleSwitcher.tsx`. Side effects:

1. Set cookie `NEXT_LOCALE` (1 tahun).
2. PATCH `/api/users/me` { locale } kalau user login.
3. `router.refresh()` untuk reload server messages.

## Resolution priority

Locale di-resolve dengan urutan:

1. `users.locale` dari session
2. Cookie `NEXT_LOCALE`
3. `Accept-Language` header
4. `DEFAULT_LOCALE` (`id`)

## Wiring ke Next.js

Tambahkan `next-intl/plugin` di `next.config.ts` (scaffold-owner):

```ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");
export default withNextIntl(nextConfig);
```

Dan wrap layout root dengan `NextIntlClientProvider` (Agent 9 di
`app/layout.tsx`). Modul ini sudah expose `request.ts` default export.
