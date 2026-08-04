#!/usr/bin/env bash
# NOVA — live health check for the full platform
set -u

echo "================================="
echo " NOVA LIVE HEALTH CHECK"
echo "================================="

check() {
  local label="$1" url="$2"
  echo ""
  echo "[${label}] ${url}"
  if command -v curl >/dev/null 2>&1; then
    code=$(curl -sS -o /tmp/nova-health.out -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
    echo "HTTP ${code}"
    head -c 400 /tmp/nova-health.out 2>/dev/null; echo
  else
    echo "curl not installed"
  fi
}

check "SOVEREIGN API" "http://127.0.0.1:8000/api/health"
check "SIDEKICK API"  "http://127.0.0.1:8001/api/health"
check "CORE API docs" "http://127.0.0.1:8002/docs"
check "SOVEREIGN UI"  "http://127.0.0.1:3000"
check "SIDEKICK UI"   "http://127.0.0.1:5173"

echo ""
echo "================================="
echo " HEALTH CHECK COMPLETE"
echo "================================="
