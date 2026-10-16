#!/usr/bin/env python3
"""Maak read-only dash_app user op .14 voor Next (fase 1)."""
from pathlib import Path
import paramiko

from homelab import secret, ssh_key_kwargs

SCRIPT_DIR = Path(__file__).resolve().parent
PASS = secret("DASH_APP_DB_PASS")
# LAN-subnet + Next-server
HOSTS = ["192.168.1.%", "192.168.1.32"]


def main():
    s = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            s[k.strip()] = v.strip()
    host, user, pw = s["DB_HOST"], s["SSH_USER"], s["SSH_PASS"]
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, timeout=15, **ssh_key_kwargs())
    for h in HOSTS:
        sql = (
            f"CREATE USER IF NOT EXISTS 'dash_app'@'{h}' IDENTIFIED BY '{PASS}'; "
            f"GRANT SELECT ON weerdata.* TO 'dash_app'@'{h}'; "
        )
        _, o, e = c.exec_command(f"mysql -u root -p{pw} -e \"{sql} FLUSH PRIVILEGES;\"")
        print(o.read().decode() or e.read().decode() or f"OK dash_app@{h}")
    c.close()
    print("DATABASE_URL=mysql://dash_app:<DASH_APP_DB_PASS>@192.168.1.14:3306/weerdata")


if __name__ == "__main__":
    main()
