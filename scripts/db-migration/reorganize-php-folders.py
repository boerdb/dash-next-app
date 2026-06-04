#!/usr/bin/env python3
"""
Orden PHP op 192.168.1.52 per database (data op .14):
  weer/      -> weerdata
  personen/  -> personen_db
  labels/    -> ic_labels_db
"""
from __future__ import annotations

import sys
from pathlib import Path

import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent
WEB = "/var/www/html"

LAYOUT: dict[str, list[str]] = {
    "weer": [
        "api.php",
        "historie.php",
        "historie_energie.php",
        "energie.php",
        "save_weather.php",
        "save_energy.php",
        "getijden_beheer.php",
        "upload.php",
        "data.json",
        "dagstart.json",
    ],
    "personen": ["login.php", "register.php", "api_personen.php"],
    "labels": [],  # filled from api/labels_api.php
}

README = {
    "weer": "# weer/ → MariaDB `weerdata` op 192.168.1.14\n",
    "personen": "# personen/ → MariaDB `personen_db` op 192.168.1.14\n",
    "labels": "# labels/ → MariaDB `ic_labels_db` op 192.168.1.14\n",
}

# Symlinks in webroot voor oude URLs (weerstation, cron, domein)
ROOT_SYMLINKS = {
    "upload.php": "weer/upload.php",
    "save_weather.php": "weer/save_weather.php",
    "save_energy.php": "weer/save_energy.php",
    "getijden_beheer.php": "weer/getijden_beheer.php",
    "api.php": "weer/api.php",
    "historie.php": "weer/historie.php",
    "historie_energie.php": "weer/historie_energie.php",
    "energie.php": "weer/energie.php",
}

CRON_LINES = """*/5 * * * * wget -q -O /dev/null http://localhost/weer/save_weather.php
*/5 * * * * wget -q -O /dev/null http://localhost/weer/save_energy.php
5 0 * * * wget -q -O /dev/null "http://localhost/weer/getijden_beheer.php?actie=vul"
"""


def load_secrets() -> dict[str, str]:
    data: dict[str, str] = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        data[k.strip()] = v.strip()
    return data


def ssh(host: str, user: str, pw: str, cmd: str, timeout: int = 120) -> tuple[int, str, str]:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=pw, timeout=15)
    try:
        _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        return stdout.channel.recv_exit_status(), out, err
    finally:
        client.close()


def main() -> int:
    s = load_secrets()
    host, user, pw = s["PHP_HOST"], s["SSH_USER"], s["SSH_PASS"]

    cmd = f"""
set -e
cd {WEB}

# labels_api uit oude api/ map
mkdir -p weer personen labels
if [ -f api/labels_api.php ]; then
  mv -v api/labels_api.php labels/labels_api.php
  rmdir api 2>/dev/null || true
fi

for f in api.php historie.php historie_energie.php energie.php save_weather.php save_energy.php getijden_beheer.php upload.php data.json dagstart.json; do
  if [ -f "$f" ]; then mv -v "$f" weer/; fi
done

for f in login.php register.php api_personen.php; do
  if [ -f "$f" ]; then mv -v "$f" personen/; fi
done

# save_energy: localhost-pad naar weer/
if grep -q 'localhost/energie.php' weer/save_energy.php 2>/dev/null; then
  sed -i 's|http://localhost/energie.php|http://localhost/weer/energie.php|g' weer/save_energy.php
fi

# README per map
cat > weer/README.txt << 'EOF'
weer/ — PHP voor weerstation + energie
Database: weerdata @ 192.168.1.14
Bestanden: api.php, historie.php, upload.php, save_*.php, ...
EOF
cat > personen/README.txt << 'EOF'
personen/ — login & personen-API
Database: personen_db @ 192.168.1.14
EOF
cat > labels/README.txt << 'EOF'
labels/ — label-templates API
Database: ic_labels_db @ 192.168.1.14
EOF

# Symlinks voor oude URLs
for link target in upload.php weer/upload.php save_weather.php weer/save_weather.php save_energy.php weer/save_energy.php getijden_beheer.php weer/getijden_beheer.php api.php weer/api.php historie.php weer/historie.php historie_energie.php weer/historie_energie.php energie.php weer/energie.php; do
  :
done
"""

    # Symlinks need proper bash loop - rewrite command block
    symlink_cmds = []
    for link, target in ROOT_SYMLINKS.items():
        symlink_cmds.append(
            f"rm -f {link}; ln -sfn {target} {link}"
        )

    cmd = f"""
set -e
cd {WEB}
mkdir -p weer personen labels
if [ -f api/labels_api.php ]; then mv -v api/labels_api.php labels/labels_api.php; rmdir api 2>/dev/null || true; fi
for f in api.php historie.php historie_energie.php energie.php save_weather.php save_energy.php getijden_beheer.php upload.php; do
  [ -f "$f" ] && mv -v "$f" weer/ || true
done
[ -f data.json ] && mv -v data.json weer/ || true
[ -f dagstart.json ] && mv -v dagstart.json weer/ || true
for f in login.php register.php api_personen.php; do
  [ -f "$f" ] && mv -v "$f" personen/ || true
done
if grep -q 'localhost/energie.php' weer/save_energy.php 2>/dev/null; then
  sed -i 's|http://localhost/energie.php|http://localhost/weer/energie.php|g' weer/save_energy.php
fi
printf '%s' 'weer/ — DB weerdata @ 192.168.1.14\\n' > weer/README.txt
printf '%s' 'personen/ — DB personen_db @ 192.168.1.14\\n' > personen/README.txt
printf '%s' 'labels/ — DB ic_labels_db @ 192.168.1.14\\n' > labels/README.txt
{chr(10).join(symlink_cmds)}
echo '--- structuur ---'
find weer personen labels -maxdepth 1 -type f | sort
ls -la {WEB} | head -25
"""

    print("==> Mappen aanmaken en bestanden verplaatsen...")
    code, out, err = ssh(host, user, pw, cmd)
    print(out)
    if err:
        print(err, file=sys.stderr)
    if code != 0:
        return 1

    # Cron bijwerken
    print("==> Cron bijwerken...")
    cron_cmd = f"""
(crontab -l 2>/dev/null | grep -v save_weather | grep -v save_energy | grep -v getijden_beheer | grep -v '^$'; cat << 'CRON'
{CRON_LINES.strip()}
CRON
) | crontab -
crontab -l
"""
    code, out, err = ssh(host, user, pw, cron_cmd)
    print(out or err)

    print("==> HTTP-tests...")
    tests = [
        "weer/api.php",
        "weer/historie.php",
        "weer/energie.php",
        "personen/login.php",
        "labels/labels_api.php",
        "api.php",
    ]
    for path in tests:
        code, out, err = ssh(
            host,
            user,
            pw,
            f"wget -qO- 'http://127.0.0.1/{path}?t=1' 2>/dev/null | head -c 80 || echo FAIL",
        )
        status = "OK" if out.strip() and out.strip() != "FAIL" else "CHECK"
        print(f"  {status} /{path}: {out.strip()[:80]}")

    print("\nKlaar. Zet DATABASE_URL op de Next-server (.32); zie INFRA.md.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
