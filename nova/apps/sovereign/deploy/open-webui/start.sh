#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export NOVA_BASE_URL="${NOVA_BASE_URL:-http://host.containers.internal:8001}"
echo "NOVA OpenAI-compatible endpoint: ${NOVA_BASE_URL}/api/v1"
if command -v podman-compose >/dev/null 2>&1; then RUNNER="podman-compose";
elif command -v podman >/dev/null 2>&1; then RUNNER="podman compose";
elif command -v docker >/dev/null 2>&1; then RUNNER="docker compose";
else echo "ERROR: install podman (recommended) or docker first." >&2; exit 1; fi
echo "Using: ${RUNNER}"
${RUNNER} -f "${HERE}/docker-compose.yml" up -d
echo "Open WebUI is starting -> http://localhost:3080"
