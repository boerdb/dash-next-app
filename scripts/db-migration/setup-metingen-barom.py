#!/usr/bin/env python3
"""Kolom baromrel_hpa op metingen (druk-trend over 3 uur)."""
from pathlib import Path
import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent

SQL = """
ALTER TABLE weerdata.metingen
  ADD COLUMN IF NOT EXISTS baromrel_hpa DECIMAL(6,1) NULL
  AFTER zon_straling;
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
    _, o, e = c.exec_command(
        f"mysql -u root -p{s['SSH_PASS']} -e \"{SQL.strip()};\""
    )
    out = (o.read() + e.read()).decode("utf-8", errors="replace")
    print(out or "OK: baromrel_hpa column")
    _, o2, _ = c.exec_command(
        f"mysql -u root -p{s['SSH_PASS']} weerdata -e \"SHOW COLUMNS FROM metingen LIKE 'baromrel_hpa';\""
    )
    print(o2.read().decode("utf-8", errors="replace"))
    c.close()


if __name__ == "__main__":
    main()
