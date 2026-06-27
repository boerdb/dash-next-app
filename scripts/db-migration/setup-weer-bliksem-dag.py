#!/usr/bin/env python3
"""Tabel weer_bliksem_dag op .14 (dagelijkse WH57-telling voor jaargrafiek)."""
from pathlib import Path
import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent
SQL = """
CREATE TABLE IF NOT EXISTS weerdata.weer_bliksem_dag (
  dag DATE NOT NULL PRIMARY KEY,
  ontadingen INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
GRANT SELECT, INSERT, UPDATE, DELETE ON weerdata.weer_bliksem_dag TO 'dash_app'@'192.168.1.%';
GRANT SELECT, INSERT, UPDATE, DELETE ON weerdata.weer_bliksem_dag TO 'dash_app'@'192.168.1.32';
FLUSH PRIVILEGES;
"""


def main():
    s = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            s[k.strip()] = v.strip()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(s["DB_HOST"], username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
    for stmt in SQL.strip().split(";"):
        if stmt.strip():
            c.exec_command(
                f"mysql -u root -p{s['SSH_PASS']} -e \"{stmt.strip()};\""
            )
    print("weer_bliksem_dag OK")
    c.close()


if __name__ == "__main__":
    main()
