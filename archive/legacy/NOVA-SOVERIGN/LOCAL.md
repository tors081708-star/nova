# Running NOVA locally

A sovereign, private personal assistant. Everything runs on your machine —
no cloud LLM calls, no telemetry, no remote database. The stack binds
exclusively to `127.0.0.1`.

## Architecture

```
                127.0.0.1:3000
                      │
        ┌─────────────▼──────────────┐
        │  NOVA (FastAPI + React)    │  Docker container
        │  - JWT auth                │
        │  - Chat / Notes / Tasks    │
        │  - Docs + Q&A              │
        └─────────┬──────────┬───────┘
                  │          │
                  │          │ host.docker.internal:11434
                  │          ▼
                  │   ┌───────────────┐
                  │   │  Ollama       │  Runs natively on your host
                  │   │  llama3.1:8b  │  (not a container — keeps GPU simple)
                  │   └───────────────┘
                  │
                  ▼
        ┌──────────────────────┐
        │  MongoDB 7           │  Docker container
        │  volume ./data/mongo │
        └──────────────────────┘
```

Nothing is exposed to your LAN or the public internet.

## Prerequisites

| Tool   | Why                                  | Install                                   |
|--------|--------------------------------------|-------------------------------------------|
| Docker | Runs NOVA + Mongo                    | <https://www.docker.com/products/docker-desktop> |
| Ollama | Hosts local LLM                      | <https://ollama.com/download>             |

On **Linux**, Docker needs no extra flags; the compose file already maps
`host.docker.internal` to the gateway.

## First-time setup

```bash
# 1. Clone your private repo
git clone <your-repo-url> nova && cd nova

# 2. Create your .env
cp .env.example .env
# Open .env in your editor. At minimum, change:
#   ADMIN_EMAIL     -> your login email
#   ADMIN_PASSWORD  -> your password
#   JWT_SECRET      -> a long random string (run: openssl rand -hex 32)

# 3. Start Ollama and pull a model on your HOST machine
ollama serve &              # starts on localhost:11434
ollama pull llama3.1:8b     # ~4.7 GB. Use :70b if you have the RAM.

# 4. Build and launch NOVA
docker compose up -d --build

# 5. Open the app
open http://127.0.0.1:3000
```

Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set above.

## Swapping models

Pull any model Ollama supports:

```bash
ollama pull mistral
ollama pull qwen2.5:14b
ollama pull phi3
```

Then edit `.env`:

```ini
OLLAMA_MODELS=llama3.1:8b,mistral,qwen2.5:14b,phi3
```

Restart: `docker compose restart nova`. The model picker in the top-right
of the Chat page will show all of them.

## Cloud mode (optional)

If you ever want to use cloud models instead (GPT-5.2, Claude Sonnet 4.5,
Gemini 2.5 Pro) via the Emergent Universal Key:

```ini
LLM_BACKEND=emergent
EMERGENT_LLM_KEY=sk-emergent-...
```

Restart and the model picker will show the cloud models instead.

## Backups

All your data lives in `./data/mongo` next to `docker-compose.yml`.
Back it up with whatever you'd use for any folder on your disk.

To export as a portable archive:
```bash
docker compose down
tar czf nova-backup-$(date +%F).tgz data/
docker compose up -d
```

## Stopping / updating

```bash
docker compose down              # stop
docker compose pull mongo        # refresh Mongo image
docker compose up -d --build     # rebuild NOVA after a git pull
```

## What this setup explicitly does NOT include

- No Tailscale / remote access — NOVA is bound to `127.0.0.1` only.
- No autonomous polling / scheduled workers that act on external systems.
- No offensive tooling, no host-filesystem mounts.
- No cloud sync of your data.

If you want remote access to your own machine from another device, set that
up separately (e.g. SSH tunnel: `ssh -L 3000:127.0.0.1:3000 you@home`). NOVA
doesn't manage it.

## Security checklist (do this once)

- [ ] Enable full-disk encryption (FileVault on macOS / BitLocker on Windows /
      LUKS on Linux).
- [ ] Set a real `JWT_SECRET` in `.env`. Don't ship the example.
- [ ] Set a strong `ADMIN_PASSWORD`.
- [ ] Keep Docker and Ollama up to date.

That's the whole privacy surface. There isn't more to harden because there
isn't more exposed.
