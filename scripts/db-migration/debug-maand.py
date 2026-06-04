#!/usr/bin/env python3
import sys
import time
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


def run(cmd: str, timeout: int = 60) -> str:
    _, o, e = c.exec_command(cmd, timeout=timeout)
    return (o.read() + e.read()).decode("utf-8", errors="replace")


time.sleep(2)
print("=== maand ===")
print(run("curl -s -m 30 -w '\\nHTTP:%{http_code}' 'http://127.0.0.1:3000/api/energie/maand?jaar=2026&maand=6'"))
print("=== pm2 logs ===")
print(run("pm2 logs dash-next-app --lines 15 --nostream"))
c.close()
