#!/usr/bin/env python3
"""Verwijder MariaDB en phpMyAdmin van PHP-server (.52). PHP mysqli blijft."""
from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent


def load_secrets() -> dict[str, str]:
    data: dict[str, str] = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        data[k.strip()] = v.strip()
    return data


def ssh(host: str, user: str, pw: str, cmd: str, timeout: int = 600) -> tuple[int, str, str]:
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

    cmd = r"""
set -e
export DEBIAN_FRONTEND=noninteractive

echo "==> Stop MariaDB"
systemctl stop mariadb 2>/dev/null || true
systemctl disable mariadb 2>/dev/null || true

echo "==> Verwijder phpMyAdmin"
apt-get remove --purge -y phpmyadmin 2>/dev/null || true

echo "==> Verwijder MariaDB server/client"
apt-get remove --purge -y \
  mariadb-server mariadb-server-* \
  mariadb-client mariadb-client-* \
  mariadb-common 2>/dev/null || true

apt-get autoremove -y
apt-get autoclean -y

echo "==> MariaDB nog actief?"
systemctl is-active mariadb 2>&1 || echo "mariadb: niet actief (goed)"

echo "==> PHP mysql-extensie (moet blijven)"
dpkg -l php8.1-mysql php-mysql 2>/dev/null | grep ^ii || echo "WAARSCHUWING: php mysql ontbreekt"

echo "==> mysql CLI"
which mysql 2>/dev/null || echo "mysql CLI weg (ok)"

echo "==> Apache"
systemctl is-active apache2
"""

    print(f"Uitvoeren op {host}...")
    code, out, err = ssh(host, user, pw, cmd)
    print(out)
    if err:
        print(err, file=sys.stderr)
    if code != 0:
        print("Installatie-stap mislukt, exit", code)
        return 1

    print("\n==> HTTP-tests (PHP -> .14)")
    for path in ("weer/api.php", "weer/historie.php", "weer/energie.php", "labels/labels_api.php"):
        url = f"http://{host}/{path}?t=1"
        try:
            r = urllib.request.urlopen(url, timeout=15)
            body = r.read(80).decode("utf-8", errors="replace")
            ok = r.status == 200 and body.strip().startswith(("{", "["))
            print(f"  {'OK' if ok else 'FAIL'} {path}")
        except Exception as e:
            print(f"  FAIL {path}: {e}")
            return 1

    print("\nKlaar. Beheer databases via phpMyAdmin op 192.168.1.14.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
