# NOVA Sovereign AI

Unified workspace for the NOVA Sovereign platform: chat, agent team, and sidekick apps on a free OpenRouter / Ollama / OpenAI-compatible stack.

## Repository layout

```
nova/apps/
  sovereign/     # Primary NOVA UI + FastAPI backend
  sidekick/      # Genie Sidekick (Vite UI + API)
  core/          # Core / Real Genie API
nova/config/     # Shared models + pipeline config
nova/docs/       # Deployment notes
scripts/         # Bootstrap, start/stop/health, setup utilities
archive/legacy/  # Historical duplicate trees (not used day-to-day)
agent-team/      # Agent orchestration helpers
```

## Prerequisites

- Python 3.12 recommended (3.10+ works; avoid 3.14 for wheels)
- Node.js 18+ and npm
- Optional: MongoDB on `:27017` (podman/docker), Ollama for local models

```bash
# Fedora example
sudo dnf install -y python3 python3-pip nodejs npm
```

## Configure secrets

Set a free OpenRouter key (or rely on Ollama when available):

```bash
# Example for sovereign backend
cp nova/apps/sovereign/backend/.env.example nova/apps/sovereign/backend/.env 2>/dev/null || true
# Edit and set:
# OPENROUTER_API_KEY=sk-or-...
```

Legacy trees also use `backend/.env` / `.env.example` under each app.

## Run the full project

From the repository root:

```bash
chmod +x scripts/*.sh
./scripts/bootstrap.sh   # once: venvs, npm install, .env from examples
./scripts/start-all.sh
```

Open:

| Surface | URL |
|---------|-----|
| Sovereign UI | http://localhost:3000 |
| Sidekick UI | http://localhost:5173 |
| Sovereign API | http://localhost:8000 |
| Sidekick API | http://localhost:8001 |
| Core API | http://localhost:8002 |

Health check:

```bash
./scripts/health-check.sh
```

Stop:

```bash
./scripts/stop-all.sh
```

Runtime logs live under `scripts/logs/runtime/`.

## Run Sovereign only

```bash
cd nova/apps/sovereign
./run.sh
```

This starts MongoDB (podman if present), the FastAPI backend, and the CRA frontend.

## Install dependencies manually

Backends:

```bash
cd nova/apps/sovereign/backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

Frontends:

```bash
cd nova/apps/sovereign/frontend && npm install && npm start
cd nova/apps/sidekick/frontend && npm install && npm run dev -- --port 5173
```

## More

- Platform scripts index: [`scripts/README.md`](scripts/README.md)
- Deployment notes: [`nova/docs/DEPLOYMENT.md`](nova/docs/DEPLOYMENT.md)
- Archived setup/repair tools: `scripts/setup/`

## License

See [`LICENSE`](LICENSE).
