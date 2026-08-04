# NOVA MASTER — Sovereign AI

Free & open AI workspace. Chat + a self-organizing Agent Team + Dashboard,
running entirely on free OpenRouter models via an OpenAI-compatible gateway.
Front it with Open WebUI (podman) if you like — same free models.

## Architecture
    podman Open WebUI -> OpenAI-compatible API -> OpenRouter proxy (free)
                       -> Agent Runtime -> Files / Shell / Git

## Prerequisites (Fedora)
    sudo dnf install -y python3 python3-pip nodejs git podman
    # nodejs 18+ recommended:  sudo dnf module install nodejs:20/common

## Setup
1. Put your free OpenRouter key in backend/.env (OPENROUTER_API_KEY).
   Get one at https://openrouter.ai/keys and enable free endpoints at
   https://openrouter.ai/settings/privacy
2. Launch everything:
       ./run.sh
3. Open http://localhost:3000

## Optional: Open WebUI
    cd deploy/open-webui && ./start.sh   # -> http://localhost:3080

## Ports
- Frontend  http://localhost:3000
- Backend   http://localhost:8000  (OpenAI-compatible at /api/v1)
- MongoDB   localhost:27017 (podman container nova-mongo)
