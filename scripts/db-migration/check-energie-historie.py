#!/usr/bin/env python3
import json
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
APP = "/var/www/dash-next-app"


def run(cmd: str) -> str:
    _, o, e = c.exec_command(cmd, timeout=30)
    return (o.read() + e.read()).decode("utf-8", errors="replace")


print("crontab:\n", run("crontab -l"))
h = run("curl -sf -m 15 http://127.0.0.1:3000/api/energie/historie")
print("historie raw:\n", h[:800])
try:
    data = json.loads(h)
    non_null = [(l, w) for l, w in zip(data["labels"], data["wattage"]) if w is not None]
    print("non-null points:", len(non_null), non_null[-5:] if non_null else "none")
except Exception as ex:
    print("parse err", ex)
c.close()
