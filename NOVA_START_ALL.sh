#!/usr/bin/env bash

ROOT="$HOME/Downloads/nova-main"

echo "Starting NOVA..."

cd "$ROOT/NOVA-SOVERIGN/backend"
nohup uvicorn server:app --host 0.0.0.0 --port 8000 >/tmp/nova8000.log 2>&1 &

cd "$ROOT/genie-sidekick/backend"
nohup uvicorn server:app --host 0.0.0.0 --port 8001 >/tmp/genie8001.log 2>&1 &

cd "$ROOT/real_Genie/backend"
nohup uvicorn server:app --host 0.0.0.0 --port 8002 >/tmp/realgenie8002.log 2>&1 &

cd "$ROOT/NOVA-SOVERIGN/frontend"
nohup npm run dev -- --host 0.0.0.0 --port 3000 >/tmp/nova3000.log 2>&1 &

cd "$ROOT/genie-sidekick/frontend"
nohup npm run dev -- --host 0.0.0.0 --port 5173 >/tmp/genie5173.log 2>&1 &

echo "NOVA ONLINE"
