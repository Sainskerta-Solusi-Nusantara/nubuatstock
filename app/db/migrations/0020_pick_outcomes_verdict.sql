-- Honest winrate: verdict per outcome.
-- win = TP1 tercapai sebelum SL; loss = SL duluan / SL tanpa TP;
-- ambiguous = TP1 & SL dua-duanya tersentuh di window tapi urutan tak bisa
-- ditentukan (intraday tak tersedia); open = belum ada yang kena & belum terminal.
-- NULL = belum di-resolve (row lama, backfill pending).
ALTER TABLE "pick_outcomes" ADD COLUMN IF NOT EXISTS "verdict" text;
