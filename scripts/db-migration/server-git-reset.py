#!/usr/bin/env python3
"""Reset server working tree naar origin/main (na handmatige upload)."""
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

APP = "/var/www/dash-next-app"
SCRIPT_DIR = Path(__file__).resolve().parent
s: dict[str, str] = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.32", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)


def run(cmd: str, timeout: int = 600) -> str:
    _, o, e = c.exec_command(cmd, timeout=timeout)
    return (o.read() + e.read()).decode("utf-8", errors="replace")


print(run(f"cd {APP} && git fetch origin"))
print(run(f"cd {APP} && git reset --hard origin/main"))
print(run(f"cd {APP} && git status -sb"))
print(run(f"cd {APP} && npm run build", timeout=600))
print(run(f"cd {APP} && pm2 restart dash-next-app --update-env"))
time.sleep(3)
secret = run(f"grep '^CRON_SECRET=' {APP}/.env.local | cut -d= -f2-").strip()
print(
    run(
        f"curl -sf -m 15 -H 'Authorization: Bearer {secret}' "
        f"http://127.0.0.1:3000/api/energie/ingest"
    )
)
c.close()
print("\nServer staat gelijk met origin/main.")
