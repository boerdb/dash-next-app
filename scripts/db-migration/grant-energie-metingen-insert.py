#!/usr/bin/env python3
"""GRANT INSERT op energie_metingen voor dash_app (Next .32)."""
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
SCRIPT_DIR = Path(__file__).resolve().parent
s = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

sql = (
    "GRANT SELECT, INSERT ON weerdata.energie_metingen TO 'dash_app'@'192.168.1.32'; "
    "GRANT SELECT, INSERT ON weerdata.energie_metingen TO 'dash_app'@'192.168.1.%'; "
    "FLUSH PRIVILEGES; "
    "SHOW GRANTS FOR 'dash_app'@'192.168.1.32';"
)

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.14", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
_, o, e = c.exec_command(f"mysql -u root -p{s['SSH_PASS']} -e \"{sql}\" 2>&1", timeout=30)
print((o.read() + e.read()).decode())
c.close()
