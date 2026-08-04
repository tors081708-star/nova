# scripts/

Operational scripts for the NOVA Sovereign AI platform.

## Run the full finished stack

From the repository root:

```bash
chmod +x scripts/*.sh
./scripts/start-all.sh
```

Then verify:

```bash
./scripts/health-check.sh
```

Stop everything started by the launcher:

```bash
./scripts/stop-all.sh
```

## Layout

| Path | Purpose |
|------|---------|
| `start-all.sh` | Start Sovereign, Sidekick, and Core APIs + UIs |
| `health-check.sh` | Probe local service ports |
| `stop-all.sh` | Stop processes tracked in `logs/pids/` |
| `setup/` | Historical setup, repair, upgrade, and import utilities |
| `logs/` | Archived upgrade log + runtime logs/pids |

## Canonical ports

| Service | URL |
|---------|-----|
| Sovereign UI | http://localhost:3000 |
| Sidekick UI | http://localhost:5173 |
| Sovereign API | http://localhost:8000 |
| Sidekick API | http://localhost:8001 |
| Core API | http://localhost:8002 |

## Setup utilities (`setup/`)

These were used during consolidation and remain for reference:

- `onebox_nova_setup.sh` — import sibling repos into one workspace
- `build_nova.sh` — generate / scaffold sovereign app tree
- `NOVA_UPGRADE_FINAL.sh`, `NOVA_FINAL_REPAIR.sh`, `NOVA_LAST_MILE.sh`, `NOVA_FINAL_SWEEP.sh`, `NOVA_CLEAN_ARCHIVES.sh` — repair passes
- `NOVA_START_ALL.sh`, `NOVA_HEALTH_CHECK.sh`, `NOVA_FINAL_STATUS.md` — earlier launcher + status notes

Prefer `./scripts/start-all.sh` for day-to-day use; it resolves the consolidated `nova/apps/` layout first.
