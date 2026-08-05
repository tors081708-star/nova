# Merged repository snapshots

This `docs/` folder contains README snapshots and notes captured during the merge into the `merged` branch.

Sources included in this snapshot commit:

- `nova` — original repo snapshot (see `nova/README.md`)
- `NOVA-SOVEREIGN-AI` — original repo snapshot (see `NOVA-SOVEREIGN-AI/README.md`)
- `NOVA-SOVEREIGN-AI1` — snapshot (minimal README)
- `NOVA-SOVEREIGN-AI2` — snapshot (minimal README)

Next recommended steps (manual):

1. Inspect the layout and run tests for each subproject:
   - `cd nova && ./scripts/bootstrap.sh && ./scripts/start-all.sh` (or run dev flows per app)
2. Consolidate CI/workflows: review `.github/workflows/` in each source and combine into a single set under `.github/workflows/` in the merged repo.
3. Consolidate Docker / compose files if you plan to run everything together.
4. Verify licensing for each subproject before you publish.

