#!/usr/bin/env python3
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

APP = "/var/www/dash-next-app"
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.32", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)

def run(cmd: str, timeout: int = 600) -> str:
    _, o, e = c.exec_command(cmd, timeout=timeout)
    return (o.read() + e.read()).decode("utf-8", errors="replace")

print("log:", run(f"cd {APP} && git log -1 --oneline"))
built = run(f"test -d {APP}/.next && echo yes || echo no").strip()
print("build dir:", built)
if "7ea7ee5" not in run(f"cd {APP} && git log -1 --oneline"):
    sys.exit(1)
if built != "yes":
    print("building...")
    print(run(f"cd {APP} && npm run build", timeout=600))
    print(run(f"cd {APP} && pm2 restart dash-next-app --update-env"))
else:
    print(run(f"cd {APP} && pm2 restart dash-next-app --update-env"))

c.close()
