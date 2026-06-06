#!/bin/bash
# ─── Kaana Predictions — One-command local startup ─────────────────────────────
# Kills everything, starts backend + frontend + two Cloudflare tunnels,
# auto-updates .env.local with the fresh backend tunnel URL.

set -e
export PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH

BACKEND_DIR="$(cd "$(dirname "$0")/backend" && pwd)"
FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"
ENV_LOCAL="$FRONTEND_DIR/.env.local"

# ── Load Paystack key from backend .env ───────────────────────────────────────
PAYSTACK_KEY=$(grep '^NEXT_PUBLIC_PAYSTACK_KEY=' "$ENV_LOCAL" 2>/dev/null | cut -d'=' -f2 || echo "")
if [ -z "$PAYSTACK_KEY" ] || [[ "$PAYSTACK_KEY" == REPLACE* ]]; then
  echo "⚠️  Warning: NEXT_PUBLIC_PAYSTACK_KEY is not set in frontend/.env.local"
  echo "   Add your Paystack public key before payments will work."
fi

echo ""
echo "🔥 Kaana Predictions — Starting up..."
echo "─────────────────────────────────────"

# ── 1. Kill anything already running on Kaana Predictions ports ───────────────
echo "⏹  Stopping old processes..."
lsof -ti:5002 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
ps aux | grep 'cloudflared.*5002\|cloudflared.*3001' | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
sleep 1

# ── 2. Start backend ──────────────────────────────────────────────────────────
echo "⚙️  Starting backend on port 5002..."
cd "$BACKEND_DIR"
node server.js > /tmp/kaana-backend.log 2>&1 &
BACKEND_PID=$!

# Wait until backend is up
for i in {1..15}; do
  if curl -s http://localhost:5002/api/health > /dev/null 2>&1; then
    echo "✅ Backend running (PID $BACKEND_PID)"
    break
  fi
  sleep 1
done

# ── 3. Tunnel backend ─────────────────────────────────────────────────────────
echo "🌐 Creating backend tunnel..."
cloudflared tunnel --url http://localhost:5002 > /tmp/kaana-tunnel-backend.log 2>&1 &
sleep 8

BACKEND_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/kaana-tunnel-backend.log | head -1)
if [ -z "$BACKEND_URL" ]; then
  echo "❌ Could not get backend tunnel URL. Check /tmp/kaana-tunnel-backend.log"
  exit 1
fi
echo "✅ Backend tunnel: $BACKEND_URL"

# ── 4. Update frontend .env.local with new backend URL ───────────────────────
echo "📝 Updating frontend/.env.local with tunnel URL..."
# Preserve the Paystack key, update only the API URL
PAYSTACK_KEY_CURRENT=$(grep '^NEXT_PUBLIC_PAYSTACK_KEY=' "$ENV_LOCAL" 2>/dev/null | cut -d'=' -f2 || echo "REPLACE_WITH_YOUR_PAYSTACK_PUBLIC_KEY")
cat > "$ENV_LOCAL" <<EOF
NEXT_PUBLIC_API_URL=${BACKEND_URL}/api
NEXT_PUBLIC_PAYSTACK_KEY=${PAYSTACK_KEY_CURRENT}
EOF

# ── 5. Start frontend ─────────────────────────────────────────────────────────
echo "🖥  Starting frontend on port 3001..."
cd "$FRONTEND_DIR"
PORT=3001 npm run dev > /tmp/kaana-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait until frontend is up
for i in {1..20}; do
  if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Frontend running (PID $FRONTEND_PID)"
    break
  fi
  sleep 1
done

# ── 6. Tunnel frontend ────────────────────────────────────────────────────────
echo "🌐 Creating frontend tunnel..."
cloudflared tunnel --url http://localhost:3001 > /tmp/kaana-tunnel-frontend.log 2>&1 &
sleep 8

FRONTEND_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/kaana-tunnel-frontend.log | head -1)
if [ -z "$FRONTEND_URL" ]; then
  echo "❌ Could not get frontend tunnel URL. Check /tmp/kaana-tunnel-frontend.log"
  exit 1
fi
echo "✅ Frontend tunnel: $FRONTEND_URL"

# ── 7. Print summary ──────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  🎉 Kaana Predictions is LIVE!"
echo "══════════════════════════════════════════════"
echo ""
echo "  📱 Share this link (phone / public):"
echo "     $FRONTEND_URL"
echo ""
echo "  🔧 Admin panel:"
echo "     $FRONTEND_URL/portal"
echo ""
echo "  ⚙️  Backend API:"
echo "     $BACKEND_URL/api/health"
echo ""
echo "  💻 Local (your Mac only):"
echo "     http://localhost:3001"
echo ""
echo "  ⚠️  Tunnels are temporary — run ./start.sh again if they expire"
echo "══════════════════════════════════════════════"
echo ""

# Keep script alive so tunnels stay up (Ctrl+C to stop everything)
wait
