#!/usr/bin/env python3
from pathlib import Path
import paramiko
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

def run(cmd: str, wait: int = 300) -> str:
    _, o, e = c.exec_command(cmd, timeout=wait)
    out = (o.read() + e.read()).decode("utf-8", errors="replace")
    return out

print(run(f"cd {APP} && git pull"))
print(run(f"cd {APP} && npm run build", wait=600))
print(run(f"cd {APP} && pm2 restart dash-next-app --update-env"))
time.sleep(4)
print("ingest:", run("curl -s -m 8 'http://127.0.0.1:3000/api/weer/ingest?tempf=71.2&temp2f=75.6&humidity=70'"))
print("live:", run("curl -s -m 8 http://127.0.0.1:3000/api/weer/live")[:400])
c.close()
