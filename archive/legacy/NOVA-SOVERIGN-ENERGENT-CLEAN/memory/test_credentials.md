# NOVA — Test Credentials

Single-user admin auth. Configured via `backend/.env` (dev) or root `.env` (docker).

## Preview environment (Emergent-hosted)
- **URL**: https://c2324fb5-3fac-4100-8183-7f06f630d2af.preview.emergentagent.com
- **Email**: `boss@nova.app`
- **Password**: `NovaBoss2026!`

## Local docker deployment
When running `docker compose up`, credentials come from `.env` at the repo root.
The `.env.example` defaults to `boss@nova.app` / `change-this-now` — users must
set their own in `.env` before first boot. JWT_SECRET must also be rotated.

## Auth behaviour
- Only the configured `ADMIN_EMAIL` can log in. No self-registration.
- JWT TTL: 7 days (`JWT_TTL_HOURS = 24 * 7`).
- On 401, frontend clears token and redirects to `/login`.

## LLM key (preview mode only)
- `EMERGENT_LLM_KEY=sk-emergent-5F76b135500D2CdD73` is set in `backend/.env`
  for the preview. Not required for local Ollama mode.
