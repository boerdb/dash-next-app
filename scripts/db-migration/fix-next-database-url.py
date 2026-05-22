#!/usr/bin/env python3
"""Zet DATABASE_URL op Next-server (.32) als die ontbreekt."""
from pathlib import Path
import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent
HOST = "192.168.1.32"
ENV_FILE = "/var/www/dash-next-app/.env.local"
DATABASE_LINE = (
    "DATABASE_URL=mysql://dash_app:kerkpoort@192.168.1.14:3306/weerdata"
)

s = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)

_, o, _ = c.exec_command(f"grep -q '^DATABASE_URL=' {ENV_FILE} 2>/dev/null; echo $?")
has = o.read().decode().strip() == "0"
if has:
    print("DATABASE_URL staat al in .env.local")
else:
    cmd = f"echo '{DATABASE_LINE}' >> {ENV_FILE}"
    c.exec_command(cmd)
    print("DATABASE_URL toegevoegd aan .env.local")

_, o, e = c.exec_command("cd /var/www/dash-next-app && pm2 restart dash-next-app --update-env")
print((o.read() + e.read()).decode())

import time

time.sleep(3)
_, o, _ = c.exec_command(
    "curl -s -m 8 'http://127.0.0.1:3000/api/weer/ingest?tempf=75.2&humidity=70&windspeedmph=0&windspdmph_avg10m=0&winddir=0'"
)
print("ingest test:", o.read().decode().strip())
_, o, _ = c.exec_command("curl -s -m 8 'http://127.0.0.1:3000/api/weer/live'")
live = o.read().decode()
print("live temp_c snippet:", live[live.find("temp_c"): live.find("temp_c") + 30] if "temp_c" in live else live[:120])
c.close()
