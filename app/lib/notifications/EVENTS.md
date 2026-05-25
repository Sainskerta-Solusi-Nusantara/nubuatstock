# Notifications — Event Contract

## Templates di-consume (`templateKey` yang harus exist di DB)

Setiap agent yang emit notifikasi WAJIB pakai `templateKey` yang sudah di-seed.
Kalau perlu template baru → tambahkan di `db/seed/notification-templates.ts`
sebelum kirim PR yang pakai key tersebut.

| Template Key | Emitter (Agent) | Channels (default) | Required Vars |
|---|---|---|---|
| `auth.email_verification` | 3 | email, in_app | `name`, `verifyUrl`, `expiresInMinutes` |
| `auth.password_reset` | 3 | email | `name`, `resetUrl`, `expiresInMinutes` |
| `auth.mfa_enabled` | 3 | email, in_app | `name`, `enabledAt` |
| `alert.price_triggered` | 6 | in_app, email | `name`, `ticker`, `price`, `direction`, `tickerUrl` |
| `picks.daily_ready` | 8 | in_app, email | `name`, `date`, `count`, `picksUrl` |
| `billing.invoice_paid` | 4 | in_app, email | `name`, `invoiceNumber`, `amount`, `nextRenewalDate`, `invoiceUrl` |
| `billing.subscription_expired` | 4 | in_app, email | `name`, `tier`, `expiredAt`, `renewUrl` |

## Queue topic

- `notifications.send` — BullMQ queue, di-handle oleh Agent 10 worker.
  Payload shape:
  ```ts
  interface NotificationJob {
    notificationId: string;
    channel: "email" | "push" | "sms" | "whatsapp";
    userId: string;
    templateKey: string;
    subject: string | null;
    body: string;
    isHtml: boolean;
    payload: { deliveryId?: string; variables: Record<string, unknown> };
  }
  ```

- Helper enqueue: `enqueueNotificationJob(job)` di `@/lib/queue/notifications`
  (Agent 10 owns). Kalau modul belum tersedia, dispatcher fallback ke log warn
  + simpan row `notification_deliveries` dengan status="queued".

## In-app dispatch flow

1. `sendNotification({ userId, templateKey, variables })` di-panggil dari kode.
2. Renderer load template aktif (highest version, isActive=true) untuk locale
   user (fallback `id-ID`).
3. Insert satu row `notifications` (untuk feed in-app + badge).
4. Untuk channel `in_app`: langsung tandai delivery sebagai `sent`.
5. Untuk channel external: insert delivery row status=`queued` lalu enqueue.

## API endpoints (Agent 12 owns)

- `GET /api/notifications?limit=&cursor=&unreadOnly=`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/[id]/read`
- `POST /api/notifications/mark-all-read`
