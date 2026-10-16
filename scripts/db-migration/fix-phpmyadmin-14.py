#!/usr/bin/env python3
"""Diagnose en herstel phpMyAdmin op DB-server (.14)."""
from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

import paramiko

from homelab import secret, ssh_key_kwargs

SCRIPT_DIR = Path(__file__).resolve().parent


def load() -> dict[str, str]:
    d = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip()
    return d


def ssh(host: str, user: str, pw: str, cmd: str, timeout: int = 120) -> tuple[int, str, str]:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, timeout=20, **ssh_key_kwargs())
    try:
        _, o, e = c.exec_command(cmd, timeout=timeout)
        return o.channel.recv_exit_status(), o.read().decode(), e.read().decode()
    finally:
        c.close()


def main() -> int:
    s = load()
    host = s["DB_HOST"]
    user, pw = s["SSH_USER"], s["SSH_PASS"]

    print(f"Verbinden met {host}...")
    try:
        code, out, err = ssh(host, user, pw, "hostname")
    except Exception as ex:
        print(f"Geen SSH naar {host}: {ex}")
        print("\nEerst oplossen:")
        print("  1. Start de LXC/VM .14 in Proxmox")
        print("  2. Controleer IP nog 192.168.1.14 is")
        print("  3. Zelfde VLAN als je PC (.52 bereikbaar = netwerk ok)")
        return 1

    print(out.strip())

    cmd = r"""
set -e
export DEBIAN_FRONTEND=noninteractive

echo "==> Services"
for s in apache2 mariadb nginx; do
  systemctl is-active $s 2>/dev/null && echo "$s: active" || echo "$s: -"
done

echo "==> phpMyAdmin geinstalleerd?"
dpkg -l phpmyadmin 2>/dev/null | grep ^ii || echo "NIET geinstalleerd"

echo "==> Apache phpMyAdmin config"
ls -la /etc/apache2/conf-enabled/ 2>/dev/null | grep -i phpmy || true
ls -la /etc/phpmyadmin/ 2>/dev/null | head -5 || true

echo "==> Luisterende poorten"
ss -tlnp | grep -E ':80|:443' || netstat -tlnp 2>/dev/null | grep -E ':80|:443' || true

echo "==> UFW"
ufw status 2>/dev/null | head -15 || echo "ufw niet actief"

echo "==> Herstel: apache + phpmyadmin"
apt-get update -qq
apt-get install -y apache2 php php-mysql phpmyadmin libapache2-mod-php 2>/dev/null || true

# phpMyAdmin non-interactive als nog niet geinstalleerd
if ! dpkg -l phpmyadmin 2>/dev/null | grep -q ^ii; then
  echo "phpmyadmin phpmyadmin/dbconfig-install boolean true" | debconf-set-selections
  echo "phpmyadmin phpmyadmin/app-password-confirm password __PMA_APP_PASS__" | debconf-set-selections
  echo "phpmyadmin phpmyadmin/mysql/admin-pass password __MYSQL_ROOT_PASS__" | debconf-set-selections
  echo "phpmyadmin phpmyadmin/mysql/app-pass password __PMA_APP_PASS__" | debconf-set-selections
  echo "phpmyadmin phpmyadmin/reconfigure-webserver multiselect apache2" | debconf-set-selections
  apt-get install -y phpmyadmin
fi

a2enconf phpmyadmin 2>/dev/null || true
a2enmod rewrite 2>/dev/null || true
systemctl enable apache2 mariadb
systemctl restart mariadb
systemctl restart apache2

echo "==> Lokaal test"
wget -qO- http://127.0.0.1/phpmyadmin/ 2>/dev/null | head -c 100 || wget -qO- http://127.0.0.1/ 2>/dev/null | head -c 100
echo ""
"""
    cmd = cmd.replace("__PMA_APP_PASS__", secret("PHPMYADMIN_APP_PASS")).replace(
        "__MYSQL_ROOT_PASS__", secret("MYSQL_ROOT_PASS")
    )
    code, out, err = ssh(host, user, pw, cmd, timeout=300)
    print(out)
    if err:
        print(err, file=sys.stderr)

    for path in ("/phpmyadmin/", "/"):
        url = f"http://{host}{path}"
        try:
            r = urllib.request.urlopen(url, timeout=10)
            print(f"HTTP {path}: {r.status}")
        except Exception as e:
            print(f"HTTP {path}: {e}")

    print(f"\nProbeer in browser: http://{host}/phpmyadmin/")
    print("Login: admin of root (wachtwoorden in .secrets.local / je wachtwoordbeheer)")
    return 0 if code == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
