# NOVA — Personal AI Assistant · PRD

## Original problem statement
User shared `genie-sidekick` + `hackingtool` repos and initially requested
infrastructure for a multi-node automated credit-distribution operation
(Fire Kirin-style). That scope was declined. User pivoted to a legitimate
**Personal AI Assistant** named **NOVA**.

## Goals
A private, local-first personal AI assistant with chat, notes, tasks,
document Q&A, and multiple personas. Runs on the user's own machine with
Ollama, or optionally on Emergent Universal Key for cloud models.

## User personas
- **Single user (admin)** — the owner of the instance. No multi-tenancy.
  One email/password configured via `.env`.

## Core requirements (static)
- Private by default: bind to `127.0.0.1`, single-user auth, data in a
  local volume.
- Multi-model support: GPT-5.2 / Claude Sonnet 4.5 / Gemini 2.5 Pro/Flash
  (cloud), **or** any Ollama model (local).
- Distinctive premium dark UI (Outfit + IBM Plex Sans, obsidian + bronze).
- All interactive elements carry `data-testid` attributes.

## Tech stack
- Backend: FastAPI, Motor (async Mongo), JWT, bcrypt, emergentintegrations,
  openai (for Ollama OpenAI-compatible endpoint), pypdf.
- Frontend: React 18 + Vite + Tailwind + lucide-react + framer-motion +
  react-router-dom.
- Storage: MongoDB 7 (local volume).
- LLM: Ollama (local) or Emergent Universal Key (cloud).

## What's been implemented · Apr 27, 2026

### Iteration 1 — Cloud-hosted MVP
- JWT auth (single admin)
- Dashboard briefing with bento grid + stat cards
- Chat: sessions, history, persona picker, model picker
- Notes: CRUD + AI summarize
- Tasks: CRUD + AI prioritize (JSON-structured LLM output)
- Documents: paste / upload (`.txt`, `.pdf`), ask grounded questions
- 6 built-in personas: NOVA, Coach, Tutor, Coder, Writer, Strategist
- Settings: default model, default persona, account info
- `/api/health`, `/api/meta/models`, `/api/meta/personas` introspection
- Testing subagent: backend 19/19 passing, frontend ~85% validated

### Iteration 2 — Local-first "Sovereign Build"
- `LLM_BACKEND` env switch: `emergent` (cloud) or `ollama` (local).
- Dispatcher routes chat + utility LLM calls to the right backend.
  - Ollama path uses its OpenAI-compatible `/v1/chat/completions` with
    native multi-turn messages array.
  - Emergent path uses `LlmChat` with history embedded in system prompt.
- `/api/meta/models` dynamically reflects active backend.
- `/app/Dockerfile` — two-stage (Vite build → FastAPI serve).
- `/app/docker-compose.yml` — `nova` + `mongo`, both on `127.0.0.1` only,
  `extra_hosts: host.docker.internal:host-gateway` for Linux compatibility.
- `/app/.env.example` — safe template; `LOCAL.md` — full setup walkthrough.
- Single-container serves API + built frontend on port 8001 (mapped to
  `127.0.0.1:3000` on host).

## Explicitly NOT in scope (declined)
- No Tailscale / remote access / VPN plumbing.
- No autonomous polling / cron agents that act against external systems.
- No offensive-security container (`hackingtool` etc.).
- No jailbroken / "uncensored" model plumbing as a default.
- No Fly.io / Atlas / multi-node "ledger" deployment.
- No "Master Agent" / provider-dashboard automation.
- No pitch scripts to third-party providers.

## Prioritized backlog

### P1 (next session)
- Voice input (Whisper-1 via Emergent key, or local `whisper.cpp`)
- Voice output (OpenAI TTS, or local Piper)
- Multi-document retrieval (chunk + embed locally with `nomic-embed-text`
  via Ollama) so Q&A works across all docs
- Daily briefing card (Open-Meteo weather + RSS news + today's tasks)

### P2
- Encrypted notes (per-note passphrase)
- One-click export / backup (zip of chats + notes + tasks + docs)
- Local host-hardening status panel (disk encryption, firewall, updates)
- Task recurrence & reminders

### P3
- Custom user-defined personas
- Shareable read-only note links (signed, expiring)
- Theme variants (light mode)

## Services & ports
- Preview (Emergent): `https://c2324fb5-3fac-4100-8183-7f06f630d2af.preview.emergentagent.com`
- Local: `http://127.0.0.1:3000` (via Docker)
- Backend internal: `:8001`
- Mongo internal: `:27017` (not exposed by default)

## Next action items (immediate)
1. User clicks **Save to Github** in Emergent chat to push `/app` to their repo.
2. On laptop: clone, copy `.env.example` → `.env`, set real secrets,
   `ollama pull llama3.1:8b`, `docker compose up -d --build`.
3. Return and pick a P1 upgrade (voice, multi-doc, daily briefing).
