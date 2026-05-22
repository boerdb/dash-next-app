#!/usr/bin/env python3
"""Tabel weer_live + schrijfrechten voor dash_app (fase 2)."""
from pathlib import Path
import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent

SQL = """
CREATE TABLE IF NOT EXISTS weerdata.weer_live (
  id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
  payload JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
GRANT SELECT, INSERT, UPDATE ON weerdata.weer_live TO 'dash_app'@'192.168.1.%';
GRANT SELECT, INSERT, UPDATE ON weerdata.weer_live TO 'dash_app'@'192.168.1.32';
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
            _, o, e = c.exec_command(f"mysql -u root -p{s['SSH_PASS']} -e \"{stmt.strip()};\"")
            err = e.read().decode()
            if err and "ERROR" in err:
                print(err)
            else:
                print("OK:", stmt.strip()[:60], "...")
    c.close()


if __name__ == "__main__":
    main()
