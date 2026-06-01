-- Referral Coin redemption — partial redeem support.
--
-- Menambah kolom redeemed_idr ke referral_rewards supaya Coin (kredit referral)
-- jadi saldo fungible yang bisa dipakai sebagian (menutup harga langganan persis,
-- tanpa masalah "kembalian"). Sisa = amount_idr - redeemed_idr. Status jadi
-- 'redeemed' hanya saat row habis terpakai (redeemed_idr = amount_idr).
ALTER TABLE referral_rewards
  ADD COLUMN IF NOT EXISTS redeemed_idr integer NOT NULL DEFAULT 0;
