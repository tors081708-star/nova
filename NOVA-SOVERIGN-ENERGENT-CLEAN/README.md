# NOVA

Your personal AI assistant. Private by default. Runs on your own machine.

**Features**
- Chat with conversation memory + session history
- Notes with AI summaries
- Tasks with AI prioritization
- Document Q&A (paste text or upload PDFs/TXT)
- 6 built-in personas (NOVA, Coach, Tutor, Coder, Writer, Strategist)
- Multi-model picker (local Ollama models or cloud via Emergent Universal Key)
- Bento-grid briefing dashboard

**Stack**
- Backend: FastAPI + MongoDB + JWT auth
- Frontend: React + Vite + Tailwind
- LLM: local Ollama (default) or Emergent Universal Key (GPT-5.2 / Claude / Gemini)

## Run locally (recommended)

Fully offline. Private by construction. See **[LOCAL.md](./LOCAL.md)** for the
complete walkthrough. TL;DR:

```bash
cp .env.example .env        # edit: ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET
ollama serve &              # on your host
ollama pull llama3.1:8b
docker compose up -d --build
open http://127.0.0.1:3000
```

## Run in dev mode (hot reload)

```bash
# Backend
cd backend
pip install -r requirements.txt
# Create backend/.env (see backend/.env in repo for template)
uvicorn server:app --reload --port 8001

# Frontend
cd ../frontend
yarn install
# Create frontend/.env with:  REACT_APP_BACKEND_URL=http://localhost:8001
yarn dev
# Open http://localhost:3000
```

## Configuration

Edit `.env` in the project root (used by `docker compose`), or
`backend/.env` (used in dev mode):

| Variable          | Values                     | Description                    |
|-------------------|----------------------------|--------------------------------|
| `LLM_BACKEND`     | `ollama` \| `emergent`     | Which LLM runtime to use       |
| `OLLAMA_BASE_URL` | URL                        | Your Ollama server             |
| `OLLAMA_MODELS`   | comma-separated tags       | Models shown in the picker     |
| `EMERGENT_LLM_KEY`| key string                 | Universal key for cloud models |
| `ADMIN_EMAIL`     | email                      | Your login email               |
| `ADMIN_PASSWORD`  | string                     | Your login password            |
| `JWT_SECRET`      | long random string         | Session-token signing key      |

## Privacy posture

- Data lives in a local Mongo container volume (`./data/mongo`).
- In Ollama mode, no prompts leave your machine.
- The app listens on `127.0.0.1` — not reachable from your LAN.
- Single-user only. The only account is `ADMIN_EMAIL`.

## License

Private / personal use.
