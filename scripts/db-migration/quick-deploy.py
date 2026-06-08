#!/usr/bin/env python3
import sys
import time
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
s = {}
for line in (Path(__file__).parent / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.32", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
APP = "/var/www/dash-next-app"
for cmd in [
    f"cd {APP} && git pull && npm install && npm run build && pm2 restart dash-next-app --update-env",
]:
    _, o, e = c.exec_command(cmd, timeout=600)
    print((o.read() + e.read()).decode("utf-8", errors="replace")[-800:])
time.sleep(4)
_, o, _ = c.exec_command(
    "curl -s -m 10 'http://127.0.0.1:3000/api/weer/ingest?tempf=77&temp2f=77&humidity=60&windspeedmph=2&windspdmph_avg10m=2&winddir=90'"
)
print("ingest", o.read().decode())
c.close()
