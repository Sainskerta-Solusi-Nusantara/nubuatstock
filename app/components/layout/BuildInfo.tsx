/**
 * BuildInfo — tampilkan versi app + waktu deploy terakhir + commit SHA.
 * Nilai dari NEXT_PUBLIC_* yang di-inline saat build (lihat next.config.ts `env`).
 * BUILD_TIME = waktu build/deploy (UTC ISO) → diformat ke WIB.
 */
export function BuildInfo({ className = "" }: { className?: string }) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "";
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;

  let deployedAt = "—";
  if (buildTime) {
    try {
      deployedAt = new Date(buildTime).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      });
    } catch {
      deployedAt = buildTime;
    }
  }

  return (
    <p className={`text-center text-xs text-muted-foreground ${className}`}>
      Versi <span className="font-medium text-foreground">{version}</span>
      {sha ? <span className="font-mono"> · {sha}</span> : null}
      {" · "}Deploy terakhir: {deployedAt} WIB
    </p>
  );
}
