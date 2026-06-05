#!/usr/bin/env python3
from pathlib import Path
import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent
s = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

host = "192.168.1.32"
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
cmds = [
    "grep ENPHASE /var/www/dash-next-app/.env.local 2>/dev/null || echo 'geen ENPHASE vars'",
    "grep ENLIGHTEN /var/www/dash-next-app/.env.local 2>/dev/null || echo 'geen ENLIGHTEN vars'",
    "test -d /var/www/dash-next-app/lib/enphase && echo has_enphase_code || echo no_enphase_code",
    "curl -sk -m 5 -o /dev/null -w '%{http_code}' https://192.168.1.163/production.json",
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd)
    out = (o.read() + e.read()).decode().strip()
    print(f">>> {cmd}\n{out}\n")
c.close()
