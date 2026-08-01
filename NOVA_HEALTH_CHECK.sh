#!/usr/bin/env bash

echo "================================="
echo " NOVA LIVE HEALTH CHECK"
echo "================================="

echo ""
echo "[NOVA API]"
curl -i http://127.0.0.1:8000/api/health 2>/dev/null | head -20 || true

echo ""
echo "[GENIE API]"
curl -i http://127.0.0.1:8001/api/health 2>/dev/null | head -20 || true

echo ""
echo "[REAL GENIE]"
curl -i http://127.0.0.1:8002/ 2>/dev/null | head -20 || true

echo ""
echo "[FRONTENDS]"

curl -I http://127.0.0.1:3000 2>/dev/null | head -5 || true

curl -I http://127.0.0.1:5173 2>/dev/null | head -5 || true

echo ""
echo "================================="
echo " HEALTH CHECK COMPLETE"
echo "================================="
