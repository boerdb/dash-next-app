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

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.14", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
sql = (
    "SELECT meet_moment, actueel_vermogen_w FROM energie_metingen "
    "ORDER BY meet_moment DESC LIMIT 8;"
)
_, o, e = c.exec_command(
    f"mysql -u root -p{s['SSH_PASS']} weerdata -e \"{sql}\" 2>&1", timeout=30
)
print((o.read() + e.read()).decode())
c.close()
