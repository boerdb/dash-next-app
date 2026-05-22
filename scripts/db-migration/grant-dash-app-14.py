#!/usr/bin/env python3
"""Maak read-only dash_app user op .14 voor Next (fase 1)."""
from pathlib import Path
import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent
PASS = "kerkpoort"
# LAN-subnet + typische Next-dev host
HOSTS = ["192.168.1.%", "192.168.1.120"]


def main():
    s = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            s[k.strip()] = v.strip()
    host, user, pw = s["DB_HOST"], s["SSH_USER"], s["SSH_PASS"]
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, password=pw, timeout=15)
    for h in HOSTS:
        sql = (
            f"CREATE USER IF NOT EXISTS 'dash_app'@'{h}' IDENTIFIED BY '{PASS}'; "
            f"GRANT SELECT ON weerdata.* TO 'dash_app'@'{h}'; "
        )
        _, o, e = c.exec_command(f"mysql -u root -p{pw} -e \"{sql} FLUSH PRIVILEGES;\"")
        print(o.read().decode() or e.read().decode() or f"OK dash_app@{h}")
    c.close()
    print("DATABASE_URL=mysql://dash_app:kerkpoort@192.168.1.14:3306/weerdata")


if __name__ == "__main__":
    main()
