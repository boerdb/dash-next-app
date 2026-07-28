#!/usr/bin/env python3
from pathlib import Path
import paramiko
import sys
import time

SCRIPT_DIR = Path(__file__).resolve().parent
HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"

s = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)

def run(cmd: str, wait: int = 600) -> str:
    _, o, e = c.exec_command(cmd, timeout=wait)
    return (o.read() + e.read()).decode("utf-8", errors="replace")

def safe_print(text: str) -> None:
    sys.stdout.buffer.write(text.encode("utf-8", errors="replace"))
    sys.stdout.buffer.write(b"\n")

safe_print("=== git status ===")
safe_print(run(f"cd {APP} && git status && git log --oneline -3"))

safe_print("=== source line 146 ===")
safe_print(run(f"cd {APP} && sed -n '146p' components/weather/SensorExtrasCard.tsx"))

safe_print("=== source line 103 ===")
safe_print(run(f"cd {APP} && sed -n '103p' components/weather/SensorExtrasCard.tsx"))

safe_print("=== stop pm2 ===")
safe_print(run(f"pm2 stop dash-next-app"))

safe_print("=== nuclear clean + build ===")
safe_print(run(f"cd {APP} && rm -rf .next node_modules/.cache && npm run build 2>&1 | tail -20", wait=600))

safe_print("=== check chunks for emerald-700 ===")
safe_print(run(f"cd {APP} && grep -rl 'emerald-700' .next/static/ 2>/dev/null || echo 'NO emerald-700 found'"))
safe_print(run(f"cd {APP} && grep -rl 'emerald-200/80' .next/static/ 2>/dev/null || echo 'NO emerald-200/80 found'"))
safe_print(run(f"cd {APP} && grep -rl 'emerald-800' .next/static/ 2>/dev/null || echo 'NO emerald-800 found'"))

safe_print("=== start pm2 ===")
safe_print(run(f"pm2 start dash-next-app --update-env"))
time.sleep(3)
c.close()
