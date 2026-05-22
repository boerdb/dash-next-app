#!/usr/bin/env python3
"""
Ruim weer/energie op .52 op: cron uit, weer naar archief.
Laat personen/, labels/ en Apache/PHP staan.
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent
WEB = "/var/www/html"

# Symlinks in webroot die naar weer/ wezen
ROOT_WEER_SYMLINKS = [
    "upload.php",
    "save_weather.php",
    "save_energy.php",
    "getijden_beheer.php",
    "api.php",
    "historie.php",
    "historie_energie.php",
    "energie.php",
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
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    s = load_secrets()
    host, user, pw = s["PHP_HOST"], s["SSH_USER"], s["SSH_PASS"]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    archive_dir = f"{WEB}/_archief/weer-naar-next-{stamp}"

    symlinks = " ".join(ROOT_WEER_SYMLINKS)
    cmd = f"""
set -e
echo "=== Cron vóór ==="
crontab -l 2>/dev/null || echo "(geen crontab)"

echo ""
echo "=== Cron opschonen (weer/energie/getijden) ==="
( crontab -l 2>/dev/null | grep -v save_weather | grep -v save_energy | grep -v getijden_beheer || true ) | crontab - || true

echo ""
echo "=== Cron na ==="
crontab -l 2>/dev/null || echo "(geen crontab)"

echo ""
echo "=== Archief aanmaken: {archive_dir} ==="
mkdir -p {archive_dir}

cd {WEB}

# Symlinks verwijderen
for link in {symlinks}; do
  if [ -L "$link" ] || [ -e "$link" ]; then
    rm -fv "$link"
  fi
done

# Losse weer-bestanden in webroot (legacy)
for f in api.php historie.php historie_energie.php energie.php save_weather.php save_energy.php getijden_beheer.php upload.php data.json dagstart.json; do
  if [ -e "$f" ]; then
    mv -v "$f" {archive_dir}/
  fi
done

# Hele weer/ map
if [ -d weer ]; then
  mv -v weer {archive_dir}/
fi

echo ""
echo "=== Webroot na opruiming ==="
ls -la {WEB}

echo ""
echo "=== Archief ==="
ls -laR {archive_dir} | head -80

echo ""
echo "=== HTTP check personen/labels ==="
for path in personen/login.php labels/labels_api.php; do
  if wget -q --spider "http://127.0.0.1/$path" 2>/dev/null; then
    echo "  OK /$path"
  else
    echo "  CHECK /$path"
  fi
done
"""

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=pw, timeout=15)
    _, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    client.close()

    print(out)
    if err:
        print(err, file=sys.stderr)
    if code != 0:
        print(f"Exit code: {code}", file=sys.stderr)
        return 1

    print(f"\nKlaar. Weer-archief: {archive_dir}")
    print("personen/ en labels/ ongemoeid gelaten.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
