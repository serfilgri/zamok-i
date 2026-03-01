#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.deploy.env"
EXCLUDES_FILE="$ROOT_DIR/.rsync-excludes"
SFTP_FILE="$ROOT_DIR/.vscode/sftp.json"

DRY_RUN=0
DELETE_REMOTE=0
PENDING_ONLY=0
PENDING_LIST=0
PENDING_RESET=0
STAMP_FILE="$ROOT_DIR/.deploy.last_success"
PENDING_TMP="$ROOT_DIR/.deploy.pending.tmp"

usage() {
  cat <<USAGE
Usage:
  bash scripts/deploy-rsync.sh [--dry-run] [--delete] [--pending] [--pending-list] [--pending-reset]

Options:
  --dry-run   Show what would change without uploading files.
  --delete    Mirror mode: delete files on server that are absent locally.
  --pending   Upload only files changed since last successful deploy.
  --pending-list  Show files changed since last successful deploy (with dots).
  --pending-reset  Reset pending marks (set current state as baseline).
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=1
      ;;
    --delete)
      DELETE_REMOTE=1
      ;;
    --pending)
      PENDING_ONLY=1
      ;;
    --pending-list)
      PENDING_LIST=1
      ;;
    --pending-reset)
      PENDING_RESET=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v rsync >/dev/null 2>&1; then
  echo "Error: rsync is not installed." >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi

if [[ -f "$SFTP_FILE" ]]; then
  SFTP_VALUES="$(
    node -e '
      const fs = require("fs");
      const file = process.argv[1];
      const j = JSON.parse(fs.readFileSync(file, "utf8"));
      const out = {
        host: j.host || "",
        user: j.username || "",
        port: j.port || "",
        path: j.remotePath || "",
        protocol: j.protocol || ""
      };
      process.stdout.write(JSON.stringify(out));
    ' "$SFTP_FILE"
  )"

  SFTP_HOST="$(node -e 'const j=JSON.parse(process.argv[1]);process.stdout.write(j.host||"")' "$SFTP_VALUES")"
  SFTP_USER="$(node -e 'const j=JSON.parse(process.argv[1]);process.stdout.write(j.user||"")' "$SFTP_VALUES")"
  SFTP_PORT="$(node -e 'const j=JSON.parse(process.argv[1]);process.stdout.write(String(j.port||""))' "$SFTP_VALUES")"
  SFTP_PATH="$(node -e 'const j=JSON.parse(process.argv[1]);process.stdout.write(j.path||"")' "$SFTP_VALUES")"
  SFTP_PROTOCOL="$(node -e 'const j=JSON.parse(process.argv[1]);process.stdout.write(j.protocol||"")' "$SFTP_VALUES")"

  DEPLOY_HOST="${DEPLOY_HOST:-$SFTP_HOST}"
  DEPLOY_USER="${DEPLOY_USER:-$SFTP_USER}"
  DEPLOY_PORT="${DEPLOY_PORT:-$SFTP_PORT}"
  DEPLOY_PATH="${DEPLOY_PATH:-$SFTP_PATH}"

  SFTP_PROTOCOL_LC="$(printf '%s' "$SFTP_PROTOCOL" | tr '[:upper:]' '[:lower:]')"
  if [[ "$SFTP_PROTOCOL_LC" == "ftp" ]]; then
    echo "Note: .vscode/sftp.json protocol is FTP, but rsync uses SSH transport." >&2
    echo "Ensure SSH is enabled on Beget for this account." >&2
  fi
fi

: "${DEPLOY_USER:?DEPLOY_USER is required (set it in .deploy.env or .vscode/sftp.json)}"
: "${DEPLOY_HOST:?DEPLOY_HOST is required (set it in .deploy.env or .vscode/sftp.json)}"
: "${DEPLOY_PATH:?DEPLOY_PATH is required (set it in .deploy.env or .vscode/sftp.json)}"

mkdir -p "$ROOT_DIR"
if [[ ! -f "$EXCLUDES_FILE" ]]; then
  cat > "$EXCLUDES_FILE" <<'EOF_EXCLUDES'
_pgbackup/
_pginfo/
node_modules/
.git/
.idea/
.vscode/
.DS_Store
.deploy.env
hosting-deploy-*.zip
EOF_EXCLUDES
fi

RSYNC_ARGS=(
  -avz
  --itemize-changes
  --update
  --exclude-from="$EXCLUDES_FILE"
)

if [[ "$DELETE_REMOTE" -eq 1 ]]; then
  RSYNC_ARGS+=(--delete)
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  RSYNC_ARGS+=(--dry-run)
fi

if [[ -n "${DEPLOY_PORT:-}" ]]; then
  RSYNC_ARGS+=(-e "ssh -p ${DEPLOY_PORT}")
fi

build_pending_list() {
  if [[ ! -f "$STAMP_FILE" ]]; then
    # If there was no successful deploy yet, treat all deployable files as pending.
    touch -t 197001010000 "$STAMP_FILE"
  fi

  find "$ROOT_DIR" -type f -newer "$STAMP_FILE" \
    ! -path "$ROOT_DIR/_pgbackup/*" \
    ! -path "$ROOT_DIR/_pginfo/*" \
    ! -path "$ROOT_DIR/node_modules/*" \
    ! -path "$ROOT_DIR/.git/*" \
    ! -path "$ROOT_DIR/.idea/*" \
    ! -path "$ROOT_DIR/.vscode/*" \
    ! -name ".DS_Store" \
    ! -name ".deploy.env" \
    ! -name "hosting-deploy-*.zip" \
    ! -name ".deploy.last_success" \
    ! -name ".deploy.pending.tmp" \
    -print | sed "s|^$ROOT_DIR/||" | sort > "$PENDING_TMP"
}

if [[ "$PENDING_LIST" -eq 1 || "$PENDING_ONLY" -eq 1 ]]; then
  build_pending_list
fi

if [[ "$PENDING_RESET" -eq 1 ]]; then
  touch "$STAMP_FILE"
  echo "Pending marks reset: $STAMP_FILE"
  exit 0
fi

if [[ "$PENDING_LIST" -eq 1 ]]; then
  if [[ ! -s "$PENDING_TMP" ]]; then
    echo "No pending files. Everything is up to date."
  else
    echo "Pending files (marked with ●):"
    while IFS= read -r file; do
      echo "● $file"
    done < "$PENDING_TMP"
  fi
  rm -f "$PENDING_TMP"
  exit 0
fi

echo "Deploy target: ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"
echo "Mode: $([[ "$DRY_RUN" -eq 1 ]] && echo 'dry-run' || echo 'upload')"
if [[ "$DELETE_REMOTE" -eq 1 ]]; then
  echo "Delete mode: enabled (mirror)"
else
  echo "Delete mode: disabled (only new/changed files)"
fi

if [[ "$PENDING_ONLY" -eq 1 ]]; then
  if [[ ! -s "$PENDING_TMP" ]]; then
    echo "No pending files to upload."
    rm -f "$PENDING_TMP"
    exit 0
  fi
  echo "Pending-only mode: enabled (changed since last successful deploy)"
  rsync "${RSYNC_ARGS[@]}" --files-from="$PENDING_TMP" "$ROOT_DIR/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"
  rm -f "$PENDING_TMP"
else
  rsync "${RSYNC_ARGS[@]}" "$ROOT_DIR/" "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"
fi

if [[ "$DRY_RUN" -eq 0 ]]; then
  touch "$STAMP_FILE"
  echo "Deploy mark updated: $STAMP_FILE"

  # Optional: use git as "file tree markers" in VS Code and auto-clear marks after deploy.
  # Enabled by default; set DEPLOY_GIT_AUTO_COMMIT=0 to disable.
  if command -v git >/dev/null 2>&1 && git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if [[ "${DEPLOY_GIT_AUTO_COMMIT:-1}" == "1" ]]; then
      if ! git -C "$ROOT_DIR" diff --quiet || ! git -C "$ROOT_DIR" diff --cached --quiet || [[ -n "$(git -C "$ROOT_DIR" ls-files --others --exclude-standard)" ]]; then
        git -C "$ROOT_DIR" add -A
        if git -C "$ROOT_DIR" commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"; then
          echo "Git markers reset: created deploy commit."
        else
          echo "Warning: deploy succeeded, but git auto-commit failed." >&2
        fi
      else
        echo "Git markers reset: no local changes."
      fi
    fi
  fi
fi

echo "Done."
