const ID_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "2026-05-29" → "29 Mei 2026". Aman untuk null/invalid. */
export function fmtDateId(d: string | null | undefined): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  const mi = Number(m) - 1;
  if (!y || mi < 0 || mi > 11) return d;
  return `${Number(day)} ${ID_MONTHS[mi]} ${y}`;
}
