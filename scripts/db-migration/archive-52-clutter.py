#!/usr/bin/env python3
"""Verplaats ongebruikte bestanden op .52 naar /var/www/html/_archief/."""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent

# Geen DB op .52, niet gebruikt door Next/cron-keten
ARCHIVE_ITEMS = [
    "index.html",
    "sw.js",
    "manifest.json",
    "icon-192.png",
    "icon-512.png",
    "test.php",
    "test_api.php",
    "hw.php",
    "rws.php",
    "vul_getijden.html",
    "dashboard",
]


def load_secrets() -> dict[str, str]:
    data: dict[str, str] = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        data[k.strip()] = v.strip()
    return data


def main() -> int:
    s = load_secrets()
    host, user, pw = s["PHP_HOST"], s["SSH_USER"], s["SSH_PASS"]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    archive_dir = f"/var/www/html/_archief/{stamp}"

    items = " ".join(ARCHIVE_ITEMS)
    cmd = f"""
set -e
cd /var/www/html
mkdir -p {archive_dir}
for item in {items}; do
  if [ -e "$item" ]; then
    mv -v "$item" {archive_dir}/
  else
    echo "SKIP (niet gevonden): $item"
  fi
done
echo "--- Over na archivering ---"
ls -la /var/www/html
echo "--- Archief ---"
ls -la {archive_dir}
"""

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=pw, timeout=15)
    _, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode()
    err = stderr.read().decode()
    code = stdout.channel.recv_exit_status()
    client.close()

    print(out)
    if err:
        print(err, file=sys.stderr)
    if code != 0:
        return 1

    print(f"\nKlaar. Archief: {archive_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
