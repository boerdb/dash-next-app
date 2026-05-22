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
c.connect("192.168.1.32", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
for cmd in [
    "cd /var/www/dash-next-app && pm2 restart dash-next-app --update-env",
    "curl -s -m 8 'http://127.0.0.1:3000/api/weer/ingest?tempf=71.2&temp2f=75.6&humidity=70'",
    "curl -s -m 8 http://127.0.0.1:3000/api/weer/live",
]:
    _, o, e = c.exec_command(cmd, timeout=60)
    print((o.read() + e.read()).decode("utf-8", errors="replace"))
    print("---")
c.close()
