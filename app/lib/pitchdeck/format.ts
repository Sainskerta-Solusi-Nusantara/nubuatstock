export const formatIdrCompact = (n: number): string => {
  if (n >= 1e12) return `Rp ${(n / 1e12).toFixed(2)} T`;
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(2)} Mrd`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} jt`;
  if (n >= 1e3) return `Rp ${(n / 1e3).toFixed(0)}k`;
  return `Rp ${n.toFixed(0)}`;
};

export const formatIdrFull = (n: number): string => {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;
};

export const formatNumberCompact = (n: number): string => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
};
