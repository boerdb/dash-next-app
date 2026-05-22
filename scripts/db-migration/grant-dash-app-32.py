#!/usr/bin/env python3
"""Rechten dash_app voor Next-host 192.168.1.32."""
from pathlib import Path
import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent
HOST = "192.168.1.32"
PASS = "kerkpoort"

GRANTS = [
    f"CREATE USER IF NOT EXISTS 'dash_app'@'{HOST}' IDENTIFIED BY '{PASS}'",
    f"GRANT SELECT, INSERT, UPDATE ON weerdata.weer_live TO 'dash_app'@'{HOST}'",
    f"GRANT SELECT, INSERT ON weerdata.metingen TO 'dash_app'@'{HOST}'",
    f"GRANT SELECT ON weerdata.* TO 'dash_app'@'{HOST}'",
    "FLUSH PRIVILEGES",
]


def main():
    s = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            s[k.strip()] = v.strip()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(s["DB_HOST"], username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
    for g in GRANTS:
        _, o, e = c.exec_command(f"mysql -u root -p{s['SSH_PASS']} -e \"{g};\"")
        err = e.read().decode()
        if err and "ERROR" in err:
            print("FAIL:", g, err)
        else:
            print("OK:", g[:70])
    c.close()
    print(f"\nEcowitt URL: http://{HOST}:3000/api/weer/ingest")


if __name__ == "__main__":
    main()
