#!/usr/bin/env bash
# NOVA — stop all platform processes started by scripts/start-all.sh
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="${ROOT}/scripts/logs/pids"

echo "======================================"
echo " NOVA FULL PLATFORM STOP"
echo "======================================"

if [ ! -d "$PID_DIR" ]; then
  echo "No pid directory at ${PID_DIR}"
  exit 0
fi

stopped=0
for pidf in "$PID_DIR"/*.pid; do
  [ -e "$pidf" ] || continue
  name="$(basename "$pidf" .pid)"
  pid="$(cat "$pidf" 2>/dev/null || true)"
  if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
    echo "[..]  Stopping ${name} (pid ${pid})"
    kill "$pid" 2>/dev/null || true
    # also stop child process groups when possible
    pkill -P "$pid" 2>/dev/null || true
    stopped=$((stopped + 1))
  else
    echo "[--]  ${name} not running"
  fi
  rm -f "$pidf"
done

echo ""
echo "Stopped ${stopped} tracked process(es)."
echo "Done."
