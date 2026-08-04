# NOVA Sovereign AI Platform Deployment

## Local (full stack)

```bash
./scripts/bootstrap.sh
# edit nova/apps/sovereign/backend/.env → OPENROUTER_API_KEY=...
./scripts/start-all.sh
./scripts/health-check.sh
```

Canonical ports:

| Service | URL |
|---------|-----|
| Sovereign UI | http://localhost:3000 |
| Sidekick UI | http://localhost:5173 |
| Sovereign API | http://localhost:8000 |
| Sidekick API | http://localhost:8001 |
| Core API | http://localhost:8002 |

## Sovereign only

```bash
cd nova/apps/sovereign
./run.sh
```

## Docker

```bash
docker compose up --build
```

## Validation

```
GET http://localhost:8000/health
```

Expected shape:

```json
{ "status": "healthy", "service": "NOVA" }
```
