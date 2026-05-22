#!/usr/bin/env python3
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

sql = """
SELECT COUNT(*) AS cnt FROM metingen WHERE meet_moment >= '2026-05-22 15:00:00';
SELECT meet_moment, temp_c FROM metingen ORDER BY meet_moment DESC LIMIT 3;
SHOW GRANTS FOR 'dash_app'@'192.168.1.32';
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.14", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
_, o, e = c.exec_command(f"mysql -u root -p{s['SSH_PASS']} weerdata -e \"{sql}\"")
print((o.read() + e.read()).decode("utf-8", errors="replace"))
c.close()
