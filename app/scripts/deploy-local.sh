#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# Nubuat — Deploy Lokal (development) script.
#
# Step-by-step otomatis untuk first-time setup. Idempotent — safe re-run.
#
# Requirements (cek otomatis):
#   - Node.js 22+
#   - Redis 7+ (lokal atau cloud — lihat .env REDIS_URL)
#   - Postgres reachable (Neon di .env — sudah default)
#
# Run dari /Users/haimac/nubuat/app/:
#   ./scripts/deploy-local.sh
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail

cd "$(dirname "$0")/.."

echo "🌱 Nubuat — Deploy Lokal"
echo "═════════════════════════════════════════════════════════════════"
echo ""

# ─── Pre-check ───
echo "[1/8] Cek prerequisites..."
if ! command -v node &> /dev/null; then
  echo "❌ Node.js tidak ada. Install dari https://nodejs.org (v22+)"
  exit 1
fi
NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "⚠️  Node $NODE_MAJOR terlalu lama, butuh 20+. Lanjut tapi mungkin error."
fi
echo "   ✓ Node $(node -v)"

if ! command -v npm &> /dev/null; then
  echo "❌ npm tidak ada. Install Node.js yang include npm."
  exit 1
fi
echo "   ✓ npm $(npm -v)"

if [ ! -f .env ]; then
  echo "❌ .env tidak ada. Copy dari .env.example & isi credentials."
  exit 1
fi
echo "   ✓ .env exists"

# Cek REDIS_URL connectivity (timeout 2s)
REDIS_URL=$(grep -E "^REDIS_URL=" .env | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ "$REDIS_URL" = "redis://localhost:6379" ]; then
  if ! (echo > /dev/tcp/localhost/6379) 2>/dev/null; then
    echo "⚠️  Redis lokal di localhost:6379 tidak running."
    echo "   Pilihan:"
    echo "     a) brew install redis && brew services start redis"
    echo "     b) docker run -d -p 6379:6379 redis:7"
    echo "     c) Sign up Upstash gratis & update REDIS_URL di .env"
    echo ""
    read -p "   Lanjut tanpa Redis? (worker akan crash) [y/N]: " yn
    case $yn in [Yy]* ) echo "   ⏭️  Lanjut..."; ;; * ) exit 1;; esac
  else
    echo "   ✓ Redis lokal reachable"
  fi
fi

# ─── Install ───
echo ""
echo "[2/8] Install dependencies..."
if [ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ]; then
  npm install
else
  echo "   ✓ node_modules sudah up-to-date"
fi

# ─── Fetch emiten (one-time atau saat refresh diminta) ───
echo ""
echo "[3/8] Fetch daftar emiten BEI (KSEI)..."
if [ ! -f db/seed/data/emiten.json ] || [ "${REFRESH_EMITEN:-0}" = "1" ]; then
  npm run db:fetch-emiten || echo "   ⚠️  Fetch emiten gagal — seed pakai static IDX80 saja"
else
  COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('db/seed/data/emiten.json')).totalCount)")
  echo "   ✓ Snapshot tersedia: $COUNT emiten"
fi

# ─── Migrate ───
echo ""
echo "[4/8] Run migrations..."
npm run db:migrate

# ─── Seed core data ───
echo ""
echo "[5/8] Seed reference, tiers, AI prompts, landing CMS, notifications..."
npm run db:seed

# ─── Demo users ───
echo ""
echo "[6/8] Seed demo users (user, admin, superadmin)..."
npm run db:seed-demo

# ─── Type check ───
echo ""
echo "[7/8] Type check..."
npm run typecheck || echo "   ⚠️  Ada type errors — lanjut anyway (akan diperbaiki iteratif)"

# ─── Start ───
echo ""
echo "[8/8] Setup selesai!"
echo "═════════════════════════════════════════════════════════════════"
echo ""
echo "📋 Login credentials demo:"
echo ""
echo "   ┌─────────────────────────────┬─────────────────────┬─────────────┐"
echo "   │ Email                       │ Password            │ Role        │"
echo "   ├─────────────────────────────┼─────────────────────┼─────────────┤"
echo "   │ user@nubuat.local           │ NubuatUser2026!     │ user        │"
echo "   │ admin@nubuat.local          │ NubuatAdmin2026!    │ admin       │"
echo "   │ superadmin@nubuat.local     │ NubuatSuper2026!    │ superadmin  │"
echo "   └─────────────────────────────┴─────────────────────┴─────────────┘"
echo ""
echo "🚀 Jalankan:"
echo ""
echo "   Terminal 1:  npm run dev      # http://localhost:3000"
echo "   Terminal 2:  npm run worker   # BullMQ worker"
echo ""
echo "📝 Halaman penting:"
echo "   - Landing:       http://localhost:3000"
echo "   - Login:         http://localhost:3000/login"
echo "   - Dashboard:     http://localhost:3000/dashboard"
echo "   - Admin:         http://localhost:3000/admin"
echo "   - Super Admin:   http://localhost:3000/superadmin"
echo "   - Landing CMS:   http://localhost:3000/superadmin/landing"
echo ""
echo "⚠️  Setelah login pertama, HAPUS baris BOOTSTRAP_AI_DEEPSEEK_API_KEY dari .env"
echo "   (nilai sudah aman terenkripsi di app_secrets)."
echo ""
