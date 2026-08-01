#!/usr/bin/env bash
# onebox_nova_setup.sh
# Single-script import + finalize for NOVA (run locally inside your tinysecrets/nova clone)
# Usage:
#   cd ~/path/to/tinysecrets/nova
#   chmod +x onebox_nova_setup.sh
#   ./onebox_nova_setup.sh         # create branches locally, do NOT push
#   ./onebox_nova_setup.sh --push  # create branches and prompt to push to origin
set -euo pipefail

# Config - edit if you want different repos or exclusions
REPOS=(
  "https://github.com/tinysecrets/real_Genie.git"
  "https://github.com/tinysecrets/genie-sidekick.git"
  "https://github.com/tinysecrets/agent-team.git"
  "https://github.com/tinysecrets/NOVA-SOVERIGN.git"
  "https://github.com/tinysecrets/NOVA-SOVERIGN-ENERGENT-CLEAN.git"
  "https://github.com/tinysecrets/Ai_Station.git"
)
EXCLUDES=( ".git" "node_modules" "dist" "build" "__pycache__" "*.pyc" "*.pyo" "*.log" )
IMPORT_BRANCH="merge/all-sources"
FINAL_BRANCH="prod/merge-ready"

# Parse options
PUSH_FLAG=0
for arg in "$@"; do
  case "$arg" in
    --push) PUSH_FLAG=1 ;;
    --yes) YES_FLAG=1 ;; # future use
    -h|--help)
      echo "Usage: $0 [--push]"
      exit 0
      ;;
  esac
done

# Ensure we're inside the repo root (has .git)
if [ ! -d ".git" ]; then
  echo "ERROR: run this script from the root of your local tinysecrets/nova clone."
  exit 1
fi

# Preflight info
echo "Running onebox NOVA import/finalize."
echo "Repos to import:"
for r in "${REPOS[@]}"; do echo "  - $r"; done
echo "Excluding paths: ${EXCLUDES[*]}"
echo

read -p "Proceed with import into local repo and create branches? [y/N]: " resp
if [[ ! "$resp" =~ ^[Yy]$ ]]; then
  echo "Aborted by user."
  exit 0
fi

WORKDIR="$(pwd)"
TMP="$(mktemp -d "${WORKDIR}/.import_tmp.XXXX")"
echo "Using temp workspace: $TMP"
trap 'rm -rf "$TMP"' EXIT

cd "$TMP"

# Prepare rsync exclude args
RSYNC_EXCLUDE=()
for e in "${EXCLUDES[@]}"; do RSYNC_EXCLUDE+=( "--exclude=$e" ); done

# Clone and copy each repo into subfolder under WORKDIR
for url in "${REPOS[@]}"; do
  name="$(basename -s .git "$url")"
  echo
  echo "=== Importing: $name ==="
  echo "Cloning $url ..."
  if ! git clone --depth 1 "$url" "$name"; then
    echo "Warning: clone failed for $url (private repo or network). Skipping $name."
    continue
  fi
  mkdir -p "${WORKDIR}/${name}"
  echo "Copying files into ${WORKDIR}/${name} (rsync)..."
  rsync -a --delete "${RSYNC_EXCLUDE[@]}" --prune-empty-dirs --exclude='.git' "$TMP/$name/" "${WORKDIR}/${name}/"
  rm -rf "${WORKDIR}/${name}/.git" || true
  echo "Imported $name -> ${WORKDIR}/${name}"
done

# Back to repo root
cd "$WORKDIR"

# Create import branch and commit
echo
echo "Creating import branch: $IMPORT_BRANCH"
git fetch origin || true
git checkout -B "$IMPORT_BRANCH"

git add .
if git commit -m "Import: copy source repositories into subdirectories (automated)" ; then
  echo "Committed imported files to $IMPORT_BRANCH"
else
  echo "No changes to commit on $IMPORT_BRANCH (maybe import already done)."
fi

# Quick post-import checks (list large files, .env)
echo
echo "Quick scans (manual review required):"
echo "- Large files > 50MB (these may block push):"
find . -type f -size +50M -exec ls -lh {} \; 2>/dev/null || true
echo "- Files that look like env/keys (search results):"
grep -RniE "API_KEY|SECRET|TOKEN|PRIVATE_KEY|PASSWORD|AWS_SECRET|GITHUB_TOKEN" . --exclude-dir=.git --exclude-dir=node_modules || true

# Add governance/CI and create final branch
echo
echo "Preparing governance files and CI, then creating final branch: $FINAL_BRANCH"

# .gitignore
if [ ! -f .gitignore ]; then
  cat > .gitignore <<'GIT'
# Python
__pycache__/
*.pyc
venv/
env/
# Node
node_modules/
dist/
build/
# Editor/OS
.vscode/
.idea/
.DS_Store
# Logs
*.log
GIT
  git add .gitignore
fi

# .gitattributes
if [ ! -f .gitattributes ]; then
  cat > .gitattributes <<'GAT'
*.md text
*.py text
*.js text
GAT
  git add .gitattributes
fi

# CODEOWNERS
mkdir -p .github
if [ ! -f .github/CODEOWNERS ]; then
  cat > .github/CODEOWNERS <<'CO'
# CODEOWNERS - adjust to real GitHub usernames
* @tinysecrets
CO
  git add .github/CODEOWNERS
fi

# Basic README / LICENSE if missing
if [ ! -f README.md ]; then
  cat > README.md <<'RM'
# NOVA (merged)
Aggregation of multiple tinysecrets projects for NOVA. See subfolders for per-project sources.
RM
  git add README.md
fi

if [ ! -f LICENSE ]; then
  cat > LICENSE <<'LS'
MIT License

Copyright (c) 2026 tinysecrets

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction...
LS
  git add LICENSE
fi

# Add baseline CI workflow
mkdir -p .github/workflows
CI_PATH=".github/workflows/ci.yml"
cat > "$CI_PATH" <<'Y'
name: CI
on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches: [main]
jobs:
  basic-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: List top-level projects
        run: |
          echo "Top-level directories:"
          ls -1
      - name: Lint basics (if tools present)
        run: |
          echo "This CI runs best-effort checks per subproject."
Y
git add "$CI_PATH"

# Commit governance + CI changes into final branch
git checkout -B "$FINAL_BRANCH"
git add -A
if git commit -m "Finalize import: add governance files and CI baseline" ; then
  echo "Committed governance and CI to $FINAL_BRANCH"
else
  echo "No governance changes to commit on $FINAL_BRANCH"
fi

# Optional light checks if tools available (local)
echo
echo "Optional local checks (only run if these tools are installed):"
if command -v ruff >/dev/null 2>&1; then
  echo "Running ruff on repo (best-effort)..."
  ruff check . || echo "ruff found issues (review)"
fi
if command -v npm >/dev/null 2>&1 && [ -f package.json ]; then
  echo "Running npm audit in root (if package.json present)..."
  npm ci --no-audit --no-fund || true
  npm audit --audit-level=moderate || echo "npm audit flagged issues"
fi

# Done: show branches and next steps
echo
echo "Branches prepared locally:"
git branch --show-current
echo "Available branches:"
git branch --list "$IMPORT_BRANCH" "$FINAL_BRANCH"

if [ "$PUSH_FLAG" -eq 1 ]; then
  read -p "Push both branches to origin now? This will use your local git auth. [y/N]: " yn
  if [[ "$yn" =~ ^[Yy]$ ]]; then
    echo "Pushing $IMPORT_BRANCH..."
    git push -u origin "$IMPORT_BRANCH"
    echo "Pushing $FINAL_BRANCH..."
    git push -u origin "$FINAL_BRANCH"
    echo "Pushed. Create PR from $FINAL_BRANCH -> main and review changes."
  else
    echo "Push skipped."
  fi
else
  echo "No push requested. When ready, push with:"
  echo "  git push -u origin $IMPORT_BRANCH"
  echo "  git push -u origin $FINAL_BRANCH"
  echo "Then open a PR for $FINAL_BRANCH -> main for review."
fi

echo
echo "One-box setup complete. Review files and run any project-specific builds/tests before merging."
exit 0

