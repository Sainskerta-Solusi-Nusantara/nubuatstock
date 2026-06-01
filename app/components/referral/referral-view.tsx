"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Gift, Share2, Users, Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReferralStats } from "@/lib/referral";

export interface RedeemTierOption {
  kode: string;
  nama: string;
  priceMonthlyIdr: number;
}

function formatIDR(v: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatCoin(v: number): string {
  return `${new Intl.NumberFormat("id-ID").format(v)} Coin`;
}

async function postClaim(code?: string): Promise<{ attributed: boolean }> {
  const res = await fetch("/api/referral/claim", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(code ? { code } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: { attributed: boolean };
    error?: { message?: string };
  };
  if (!res.ok || !json.ok) {
    throw new Error(json.error?.message ?? `Gagal (${res.status})`);
  }
  return json.data ?? { attributed: false };
}

export function ReferralView({
  stats,
  coinBalance,
  tiers,
}: {
  stats: ReferralStats;
  coinBalance: number;
  tiers: RedeemTierOption[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [claimErr, setClaimErr] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const autoClaimedRef = useRef(false);

  async function redeem(tierKode: string) {
    setRedeeming(tierKode);
    try {
      const res = await fetch("/api/referral/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tierKode, billingCycle: "monthly" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error?.message ?? "Gagal menukar Coin.");
        return;
      }
      toast.success(`Langganan ${json.data.tierName} aktif 1 bulan! 🎉`, {
        description: `Sisa Coin kamu: ${new Intl.NumberFormat("id-ID").format(json.data.remainingCoin)}.`,
      });
      router.refresh();
    } catch {
      toast.error("Terjadi kesalahan saat menukar Coin.");
    } finally {
      setRedeeming(null);
    }
  }

  // Auto-claim sekali saat mount: kalau ada cookie `nubuat_ref` dari landing,
  // attribute user yang sedang login. No-op kalau tidak ada / sudah pernah.
  useEffect(() => {
    if (autoClaimedRef.current) return;
    autoClaimedRef.current = true;
    postClaim()
      .then((r) => {
        if (r.attributed) router.refresh();
      })
      .catch(() => {
        /* silent — auto attempt, tidak ganggu UX */
      });
  }, [router]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(stats.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setClaimMsg(null);
    setClaimErr(null);
    const code = manualCode.trim();
    if (!code) return;
    setClaiming(true);
    try {
      const r = await postClaim(code);
      if (r.attributed) {
        setClaimMsg("Berhasil! Kode referral kamu sudah tercatat.");
        setManualCode("");
        router.refresh();
      } else {
        setClaimErr(
          "Kode tidak valid, atau kamu sudah pernah pakai kode referral sebelumnya.",
        );
      }
    } catch (err) {
      setClaimErr(err instanceof Error ? err.message : "Gagal memproses kode.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <div className="flex items-center gap-2">
          <Gift className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ajak Teman</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Bagikan link referral kamu. Tiap teman yang mulai trial, kamu dapat{" "}
          <strong>50.000 Coin</strong>. Coin tidak bisa dicairkan jadi uang, tapi
          bisa ditukar untuk berlangganan Nubuat.
        </p>
      </header>

      {/* Code + link */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-4 w-4 text-primary" />
            Link referral kamu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Kode kamu:{" "}
            <span className="font-mono font-semibold text-foreground">{stats.code}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={stats.link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Tersalin" : "Salin link"}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{stats.totalReferred}</div>
              <div className="text-xs text-muted-foreground">Teman diundang</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Check className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold">{stats.qualified}</div>
              <div className="text-xs text-muted-foreground">Qualified</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Coins className="h-8 w-8 text-amber-500" />
            <div>
              <div className="text-2xl font-bold">{new Intl.NumberFormat("id-ID").format(coinBalance)}</div>
              <div className="text-xs text-muted-foreground">Coin tersedia</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tukar Coin jadi langganan */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="h-4 w-4 text-amber-500" />
            Tukar Coin jadi langganan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Saldo kamu: <strong className="text-foreground">{formatCoin(coinBalance)}</strong>.
            Tukar dengan langganan bulanan di bawah. Coin tidak bisa dicairkan jadi uang tunai.
          </p>
          {tiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada paket yang bisa ditukar.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {tiers.map((t) => {
                const affordable = coinBalance >= t.priceMonthlyIdr;
                const busy = redeeming === t.kode;
                return (
                  <div
                    key={t.kode}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2.5"
                  >
                    <div>
                      <div className="text-sm font-semibold">{t.nama}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCoin(t.priceMonthlyIdr)} / bulan
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => redeem(t.kode)}
                      disabled={!affordable || busy}
                      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {affordable ? "Tukar" : "Coin kurang"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual claim */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Punya kode referral?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Kalau kamu daftar tanpa lewat link teman, masukkan kodenya di sini.
            Cuma bisa dipakai sekali.
          </p>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submitManual}>
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Contoh: A1B2C3D"
              maxLength={32}
              className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-sm uppercase text-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={claiming || !manualCode.trim()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {claiming ? "Memproses..." : "Pakai kode"}
            </button>
          </form>
          {claimMsg ? <p className="mt-2 text-xs text-green-500">{claimMsg}</p> : null}
          {claimErr ? <p className="mt-2 text-xs text-red-500">{claimErr}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
