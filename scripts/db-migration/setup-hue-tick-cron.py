#!/usr/bin/env python3
"""Voeg Hue-tick toe aan crontab op .32 (elke minuut, naast Tahoma)."""
import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
SCRIPT_DIR = Path(__file__).resolve().parent
APP = "/var/www/dash-next-app"
ENV_FILE = f"{APP}/.env.local"
HOST = "192.168.1.32"
MARKER = "api/hue/tick"

s = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)


def run(cmd: str) -> tuple[str, int]:
    _, o, e = c.exec_command(cmd, timeout=30)
    out = (o.read() + e.read()).decode("utf-8", errors="replace")
    return out, o.channel.recv_exit_status()


env_out, _ = run(f"grep -E '^CRON_SECRET=' {ENV_FILE} || true")
secret = ""
for line in env_out.splitlines():
    if line.startswith("CRON_SECRET="):
        secret = line.split("=", 1)[1].strip()

if secret:
    curl = f'curl -sf -H "Authorization: Bearer {secret}" http://127.0.0.1:3000/api/hue/tick'
else:
    curl = "curl -sf http://127.0.0.1:3000/api/hue/tick"

cron_line = f"* * * * * {curl} >/dev/null 2>&1"
existing, _ = run("crontab -l 2>/dev/null || true")
lines = [ln for ln in existing.splitlines() if MARKER not in ln and ln.strip()]
lines.append(cron_line)
payload = "\n".join(lines) + "\n"

stdin, o, e = c.exec_command("crontab -", timeout=30)
stdin.write(payload)
stdin.channel.shutdown_write()
out = (o.read() + e.read()).decode("utf-8", errors="replace")
code = o.channel.recv_exit_status()
print("exit:", code, out or "ok")
print(run("crontab -l | grep hue/tick")[0])
c.close()
