#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is not installed." >&2
  exit 1
fi

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: this folder is not a git repository: $ROOT_DIR" >&2
  exit 1
fi

if git -C "$ROOT_DIR" diff --quiet && git -C "$ROOT_DIR" diff --cached --quiet && [[ -z "$(git -C "$ROOT_DIR" ls-files --others --exclude-standard)" ]]; then
  echo "No local changes. Markers are already clean."
  exit 0
fi

git -C "$ROOT_DIR" add -A

git -C "$ROOT_DIR" commit -m "deploy: manual ftp $(date '+%Y-%m-%d %H:%M:%S')"

echo "Markers cleared: deploy commit created."
