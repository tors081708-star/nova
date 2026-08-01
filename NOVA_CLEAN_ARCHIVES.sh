#!/usr/bin/env bash
set -e

ROOT="$HOME/Downloads/nova-main"

echo "================================"
echo " NOVA ARCHIVE CLEANUP"
echo "================================"

cd "$ROOT"

echo "Removing leftover instruction text from archived copies..."

find . \
-path "*/real_Genie/backend/server.py" \
-not -path "./real_Genie/backend/server.py" \
-exec sed -i '/FIND this whole function/,/REPLACE the whole selection/d' {} \; 2>/dev/null || true

find . \
-path "*/real_Genie/backend/server.py" \
-not -path "./real_Genie/backend/server.py" \
-exec sed -i '/FIND this whole function/d;/REPLACE the whole selection/d' {} \; 2>/dev/null || true


echo "Final syntax check..."

find . \
-name server.py \
-not -path "*/node_modules/*" \
-exec python3 -m py_compile {} \;

echo ""
echo "================================"
echo " ALL PYTHON FILES CLEAN"
echo "================================"

echo ""
echo "Starting NOVA..."

chmod +x NOVA_START_ALL.sh

echo "Ready:"
echo "./NOVA_START_ALL.sh"

