#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "======================================"
echo " NOVA FINAL SURGICAL SWEEP"
echo "======================================"

cd "$ROOT"

echo "[1] Removing broken archived real_Genie copies..."

rm -rf \
genie-sidekick/apps/real_Genie \
review/gold_mine/PRIME_MIGRATION/ADAPTERS/real_Genie \
review/gold_mine/classified/ORE/real_Genie \
2>/dev/null || true


echo "[2] Checking MAIN projects only..."

for f in \
NOVA-SOVERIGN/backend/server.py \
NOVA-SOVERIGN-ENERGENT-CLEAN/backend/server.py \
genie-sidekick/backend/server.py \
real_Genie/backend/server.py
do
    if [ -f "$f" ]; then
        echo "Checking $f"
        python3 -m py_compile "$f"
    fi
done


echo "[3] Checking launcher..."

chmod +x "$ROOT/scripts/start-all.sh"


echo "[4] Starting services..."

"$ROOT/scripts/start-all.sh" || true


echo "[5] Checking ports..."

sleep 5

ss -tulpn | grep -E "3000|5173|8000|8001|8002" || true


echo ""
echo "======================================"
echo " NOVA FINAL SWEEP COMPLETE"
echo "======================================"

echo ""
echo "Open:"
echo "NOVA UI      http://localhost:3000"
echo "GENIE UI     http://localhost:5173"
echo "NOVA API     http://localhost:8000"
echo "GENIE API    http://localhost:8001"
echo "REAL GENIE   http://localhost:8002"

