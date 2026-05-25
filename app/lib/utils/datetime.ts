/**
 * Datetime utilities aman untuk boundary Server Component → Client Component.
 *
 * Saat data dipassing dari RSC ke Client, Date sering ter-serialize jadi string ISO.
 * Helper ini menerima Date | string | number dan normalize ke Date sebelum format,
 * sehingga komponen tidak crash dengan TypeError: x.getTime is not a function.
 */

/** Coerce input ke Date object. Aman untuk string ISO, number (epoch ms), atau Date. */
export function toDate(
  input: Date | string | number | null | undefined,
): Date | null {
  if (input === null || input === undefined) return null;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Format "X menit lalu" dalam Bahasa Indonesia. Input flexible (string/number/Date). */
export function timeAgoId(
  input: Date | string | number | null | undefined,
): string {
  const d = toDate(input);
  if (!d) return "";
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}j`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}h`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Format tanggal pendek dd MMM yyyy (id-ID). */
export function formatDateId(
  input: Date | string | number | null | undefined,
): string {
  const d = toDate(input);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format datetime lengkap dd MMM yyyy HH:mm (id-ID). */
export function formatDateTimeId(
  input: Date | string | number | null | undefined,
): string {
  const d = toDate(input);
  if (!d) return "-";
  const date = d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} ${time}`;
}
