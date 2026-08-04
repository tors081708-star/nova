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
    curl -sS -o /tmp/nova-health.out -w "HTTP %{http_code}\n" --max-time 5 "$url" 2>/dev/null \
      || echo "UNREACHABLE"
    head -c 400 /tmp/nova-health.out 2>/dev/null; echo
  else
    echo "curl not installed"
  fi
}

check "SOVEREIGN API" "http://127.0.0.1:8000/api/health"
check "SOVEREIGN API /health" "http://127.0.0.1:8000/health"
check "SIDEKICK API"  "http://127.0.0.1:8001/api/health"
check "SIDEKICK API /health" "http://127.0.0.1:8001/health"
check "CORE API"      "http://127.0.0.1:8002/"
check "SOVEREIGN UI"  "http://127.0.0.1:3000"
check "SIDEKICK UI"   "http://127.0.0.1:5173"

echo ""
echo "================================="
echo " HEALTH CHECK COMPLETE"
echo "================================="
