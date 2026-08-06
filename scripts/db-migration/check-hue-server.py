#!/usr/bin/env python3
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
SCRIPT_DIR = Path(__file__).resolve().parent
APP = "/var/www/dash-next-app"
s = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.32", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)


def run(cmd: str) -> str:
    _, o, e = c.exec_command(cmd, timeout=15)
    return (o.read() + e.read()).decode("utf-8", errors="replace")


print("=== hue-settings.json ===")
print(run(f"cat {APP}/data/hue-settings.json 2>/dev/null || echo MISSING"))
print("=== HUE in .env.local ===")
print(run(f"grep ^HUE_ {APP}/.env.local 2>/dev/null || echo none"))
print("=== status ===")
print(run("curl -s -m 8 http://127.0.0.1:3000/api/hue/status"))
c.close()
