#!/usr/bin/env python3
import argparse
import fnmatch
import json
import subprocess
from ftplib import FTP, error_perm
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

ROOT = Path.cwd()
CONFIG_PATH = ROOT / ".vscode" / "sftp.json"
EXCLUDES_PATH = ROOT / ".rsync-excludes"
DEPLOY_STAMP_PATH = ROOT / ".deploy.last_success"

# Only delete paths we explicitly know are source-only or SEO junk.
JUNK_PATHS = [
    "includes",
    "scripts",
    "landing-master.html",
    "test-include.html",
    "index.backup-2026-02-24.html",
    "services.backup-2026-02-24.html",
    "package.json",
    "package-lock.json",
]

ALLOWED_DOTFILES = {".htaccess"}


def load_config():
    return json.loads(CONFIG_PATH.read_text())


def load_excludes():
    patterns = []
    if not EXCLUDES_PATH.exists():
        return patterns

    for raw_line in EXCLUDES_PATH.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        patterns.append(line)
    return patterns


def to_posix(rel_path: Path) -> str:
    return rel_path.as_posix()


def is_excluded(rel_path: str, patterns) -> bool:
    for pattern in patterns:
        if pattern.endswith("/"):
            prefix = pattern.rstrip("/")
            if rel_path == prefix or rel_path.startswith(prefix + "/"):
                return True
            continue

        if any(ch in pattern for ch in "*?[]"):
            if fnmatch.fnmatch(rel_path, pattern):
                return True
            continue

        if rel_path == pattern or rel_path.startswith(pattern + "/"):
            return True

    return False


def collect_local_files(patterns):
    files = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue

        rel_obj = path.relative_to(ROOT)
        rel_path = to_posix(rel_obj)

        # Skip hidden service files everywhere except explicit web-required files.
        if any(
            part.startswith(".") and part not in ALLOWED_DOTFILES
            for part in rel_obj.parts
        ):
            continue

        if rel_path.endswith(".DS_Store") or rel_path.endswith(".gitkeep"):
            continue

        if is_excluded(rel_path, patterns):
            continue
        files.append(rel_path)
    return sorted(files)


def get_deploy_stamp():
    if not DEPLOY_STAMP_PATH.exists():
        return None
    return DEPLOY_STAMP_PATH.stat().st_mtime


def build_pending_files(files, deploy_stamp):
    if deploy_stamp is None:
        return files

    pending = []
    for rel_path in files:
        file_path = ROOT / rel_path
        if file_path.stat().st_mtime > deploy_stamp:
            pending.append(rel_path)
    return pending


def ftp_connect():
    cfg = load_config()
    ftp = FTP()
    ftp.connect(cfg["host"], cfg.get("port", 21), timeout=30)
    ftp.login(cfg["username"], cfg["password"])
    remote_root = cfg.get("remotePath", "/") or "/"
    ftp.cwd(remote_root)
    return ftp, PurePosixPath(remote_root)


def ensure_remote_dir(ftp: FTP, rel_dir: str):
    if not rel_dir or rel_dir == ".":
        return

    current = PurePosixPath(".")
    for part in PurePosixPath(rel_dir).parts:
        if part in ("", "."):
            continue
        current /= part
        remote_part = current.as_posix()
        try:
            ftp.mkd(remote_part)
        except error_perm:
            pass


def upload_files(ftp: FTP, files, dry_run: bool):
    uploaded = 0
    for rel_path in files:
        rel_dir = str(PurePosixPath(rel_path).parent)
        ensure_remote_dir(ftp, rel_dir)
        if dry_run:
            print(f"UPLOAD {rel_path}")
            uploaded += 1
            continue

        with (ROOT / rel_path).open("rb") as handle:
            ftp.storbinary(f"STOR {rel_path}", handle)
        print(f"UPLOADED {rel_path}")
        uploaded += 1
    return uploaded


def delete_remote_path(ftp: FTP, rel_path: str, dry_run: bool):
    if dry_run:
        print(f"DELETE {rel_path}")
        return True

    try:
        ftp.delete(rel_path)
        print(f"DELETED {rel_path}")
        return True
    except error_perm:
        pass

    try:
        entries = ftp.nlst(rel_path)
    except error_perm:
        print(f"SKIP {rel_path} (not found)")
        return False

    normalized = []
    for entry in entries:
        if entry in (".", ".."):
            continue
        entry_path = PurePosixPath(entry)
        if entry_path.as_posix() == rel_path:
            normalized.append(rel_path)
        else:
            normalized.append(entry_path.as_posix())

    for entry in normalized:
        if entry == rel_path:
            continue
        delete_remote_path(ftp, entry, dry_run)

    try:
        ftp.rmd(rel_path)
        print(f"DELETED {rel_path}/")
        return True
    except error_perm:
        print(f"SKIP {rel_path} (directory is not empty or cannot be removed)")
        return False


def cleanup_junk(ftp: FTP, dry_run: bool):
    deleted = 0
    for rel_path in JUNK_PATHS:
        if delete_remote_path(ftp, rel_path, dry_run):
            deleted += 1
    return deleted


def mark_deployed():
    DEPLOY_STAMP_PATH.touch()
    print(f"Deploy stamp updated: {DEPLOY_STAMP_PATH}")


def sync_tracker():
    script_path = ROOT / "scripts" / "sync-pages.js"
    if not script_path.exists():
        print("Tracker sync skipped: scripts/sync-pages.js not found")
        return

    subprocess.run(["node", str(script_path)], cwd=ROOT, check=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--cleanup-junk", action="store_true")
    parser.add_argument("--skip-upload", action="store_true")
    parser.add_argument("--full", action="store_true")
    args = parser.parse_args()

    patterns = load_excludes()
    all_files = collect_local_files(patterns)
    deploy_stamp = get_deploy_stamp()
    files = all_files if args.full else build_pending_files(all_files, deploy_stamp)

    ftp, remote_root = ftp_connect()
    print(f"Connected to FTP root: {remote_root}")
    if deploy_stamp is None:
        print("Last successful deploy: not found, full upload will be used")
    else:
        stamp_text = datetime.fromtimestamp(deploy_stamp, tz=timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
        print(f"Last successful deploy: {stamp_text}")
    print(f"Local deployable files: {len(all_files)}")
    if args.full:
        print(f"Upload mode: full ({len(files)} files)")
    else:
        print(f"Upload mode: incremental ({len(files)} changed files)")

    try:
        if not args.skip_upload:
            if not files:
                print("No changed files to upload.")
            else:
                uploaded = upload_files(ftp, files, args.dry_run)
                print(f"Uploaded entries: {uploaded}")

        if args.cleanup_junk:
            deleted = cleanup_junk(ftp, args.dry_run)
            print(f"Cleanup entries processed: {deleted}")
    finally:
        ftp.quit()

    if not args.dry_run and (files or args.cleanup_junk):
        mark_deployed()
        sync_tracker()


if __name__ == "__main__":
    main()
