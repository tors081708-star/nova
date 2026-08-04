#!/usr/bin/env bash
# NOVA MASTER — dev launcher for Fedora. Starts MongoDB (podman), backend, frontend.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ">> 1/3  MongoDB (podman)"
if command -v podman >/dev/null 2>&1; then
  if ! podman ps --format '{{.Names}}' | grep -q '^nova-mongo$'; then
    if podman ps -a --format '{{.Names}}' | grep -q '^nova-mongo$'; then
      podman start nova-mongo
    else
      podman run -d --name nova-mongo -p 27017:27017 docker.io/library/mongo:7
    fi
  fi
else
  echo "!! podman not found. Install it (sudo dnf install -y podman) or run MongoDB yourself on :27017"
fi

echo ">> 2/3  Backend (FastAPI :8000)"
cd "$ROOT/backend"
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000 > "$ROOT/backend/backend.log" 2>&1 &
BACK_PID=$!
echo "$BACK_PID" > "$ROOT/.backend.pid"
deactivate || true
echo "   backend pid $BACK_PID (logs: backend/backend.log)"

cleanup() { echo; echo ">> stopping backend"; kill "$BACK_PID" 2>/dev/null || true; exit 0; }
trap cleanup INT TERM

echo ">> 3/3  Frontend (CRA :3000)"
cd "$ROOT/frontend"
[ -d node_modules ] || npm install
npm start
