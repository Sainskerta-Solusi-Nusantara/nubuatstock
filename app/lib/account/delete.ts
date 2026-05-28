/**
 * UU PDP — Account deletion (hak penghapusan data subjek data pribadi).
 *
 * Implementasi SOFT-DELETE dengan grace period 30 hari:
 *  - `requestAccountDeletion` menandai akun: set `deletionRequestedAt = now`,
 *    `scheduledDeletionAt = now + 30 hari`, dan `deletedAt = now` (soft delete
 *    sehingga akun tidak bisa lagi dipakai login / muncul di query aktif).
 *  - User masih bisa membatalkan (cancel) dalam masa grace lewat
 *    `cancelAccountDeletion` selama `scheduledDeletionAt` belum lewat.
 *  - HARD-DELETE permanen (purge baris + cascade) dilakukan oleh worker/cron
 *    terpisah yang men-sweep `scheduledDeletionAt <= now()`. Itu di luar scope
 *    file ini (lihat FOLLOW-UP di laporan).
 */
import { and, eq, gt, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/db/schema/auth";

export const DELETION_GRACE_DAYS = 30;

export interface DeletionResult {
  userId: string;
  deletionRequestedAt: Date;
  scheduledDeletionAt: Date;
  graceDays: number;
}

/** Hitung waktu eksekusi hard-delete dari waktu request. */
export function computeScheduledDeletion(from = new Date()): Date {
  return new Date(from.getTime() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Tandai akun untuk dihapus (soft delete + jadwal grace 30 hari).
 * Idempotent-ish: kalau sudah ada `scheduledDeletionAt` aktif, jadwal lama
 * dipertahankan supaya grace period tidak ter-reset oleh klik berulang.
 */
export async function requestAccountDeletion(
  userId: string,
  now = new Date(),
): Promise<DeletionResult> {
  const existing = await db
    .select({
      deletionRequestedAt: users.deletionRequestedAt,
      scheduledDeletionAt: users.scheduledDeletionAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing.length === 0) {
    // User tidak ditemukan — perlakukan sebagai no-op aman (caller sudah auth).
    const scheduled = computeScheduledDeletion(now);
    return {
      userId,
      deletionRequestedAt: now,
      scheduledDeletionAt: scheduled,
      graceDays: DELETION_GRACE_DAYS,
    };
  }

  const current = existing[0]!;
  if (
    current.scheduledDeletionAt &&
    current.scheduledDeletionAt.getTime() > now.getTime()
  ) {
    // Sudah dijadwalkan & masih dalam grace — kembalikan jadwal eksisting.
    return {
      userId,
      deletionRequestedAt: current.deletionRequestedAt ?? now,
      scheduledDeletionAt: current.scheduledDeletionAt,
      graceDays: DELETION_GRACE_DAYS,
    };
  }

  const scheduled = computeScheduledDeletion(now);
  await db
    .update(users)
    .set({
      deletionRequestedAt: now,
      scheduledDeletionAt: scheduled,
      deletedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  return {
    userId,
    deletionRequestedAt: now,
    scheduledDeletionAt: scheduled,
    graceDays: DELETION_GRACE_DAYS,
  };
}

/**
 * Batalkan permintaan penghapusan selama masih dalam masa grace
 * (scheduledDeletionAt > now). Mengembalikan `true` kalau berhasil dibatalkan.
 */
export async function cancelAccountDeletion(
  userId: string,
  now = new Date(),
): Promise<boolean> {
  const result = await db
    .update(users)
    .set({
      deletionRequestedAt: null,
      scheduledDeletionAt: null,
      deletedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(users.id, userId),
        isNotNull(users.scheduledDeletionAt),
        gt(users.scheduledDeletionAt, now),
      ),
    )
    .returning({ id: users.id });

  return result.length > 0;
}
