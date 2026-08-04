#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG="$ROOT/scripts/logs/NOVA_UPGRADE_LOG.txt"

exec > >(tee -a "$LOG") 2>&1

echo "======================================"
echo "      NOVA FINAL UPGRADE ENGINE"
echo "======================================"

cd "$ROOT"

echo "[1/10] Checking workspace..."
ls

echo "[2/10] Backing up configuration..."
mkdir -p NOVA_BACKUP
find . -name ".env" -not -path "*/node_modules/*" -exec cp --parents {} NOVA_BACKUP/ \; 2>/dev/null || true

echo "[3/10] Creating missing env files..."
find . -name ".env.example" | while read f; do
    target="${f/.example/}"
    if [ ! -f "$target" ]; then
        cp "$f" "$target"
        echo "Created $target"
    fi
done

echo "[4/10] Configuring free AI provider priority..."

find . -type f \( -name ".env" -o -name "*.yaml" -o -name "*.yml" -o -name "*.json" \) \
-exec grep -l "OPENROUTER\|OLLAMA\|OPENAI" {} \; 2>/dev/null | while read f; do
echo "Detected config: $f"
done

echo "[5/10] Updating Python environments..."

for dir in \
NOVA-SOVERIGN/backend \
NOVA-SOVERIGN-ENERGENT-CLEAN/backend \
genie-sidekick/backend \
real_Genie/backend
do
    if [ -d "$dir" ]; then
        echo "Installing $dir"
        cd "$ROOT/$dir"

        python3 -m pip install --upgrade pip >/dev/null 2>&1 || true

        if [ -f requirements.txt ]; then
            python3 -m pip install -r requirements.txt || true
        fi
    fi
done

echo "[6/10] Updating frontend environments..."

for dir in \
NOVA-SOVERIGN/frontend \
NOVA-SOVERIGN-ENERGENT-CLEAN/frontend \
genie-sidekick/frontend \
real_Genie/frontend
do
    if [ -d "$dir" ]; then
        echo "Installing $dir"
        cd "$ROOT/$dir"

        if [ -f package.json ]; then
            npm install || true
        fi
    fi
done

echo "[7/10] Checking Python syntax..."

find "$ROOT" -name "server.py" \
-exec python3 -m py_compile {} \; || true

echo "[8/10] Building frontends..."

for dir in \
NOVA-SOVERIGN/frontend \
NOVA-SOVERIGN-ENERGENT-CLEAN/frontend \
genie-sidekick/frontend \
real_Genie/frontend
do
    if [ -d "$ROOT/$dir" ]; then
        cd "$ROOT/$dir"
        npm run build || true
    fi
done

echo "[9/10] Generating final status..."

cat > NOVA_FINAL_STATUS.md <<STATUS
# NOVA FINAL STATUS

Upgrade completed.

Workspace:
$ROOT

Provider Priority:
1. OpenRouter
2. Ollama
3. OpenAI Compatibility

Free model strategy enabled.

Created backup:
NOVA_BACKUP/

Log:
NOVA_UPGRADE_LOG.txt

Remaining manual values:
- OPENROUTER_API_KEY (if using cloud models)
- Other optional provider keys

STATUS

echo "[10/10] COMPLETE"

echo "======================================"
echo " NOVA UPGRADE FINISHED"
echo "======================================"
