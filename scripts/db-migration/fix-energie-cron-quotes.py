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

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.32", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)


def run(cmd: str) -> str:
    _, o, e = c.exec_command(cmd)
    return (o.read() + e.read()).decode("utf-8", errors="replace")


secret = run("grep '^CRON_SECRET=' /var/www/dash-next-app/.env.local | cut -d= -f2-").strip()
line = (
    f"*/5 * * * * curl -sf -H \"Authorization: Bearer {secret}\" "
    "http://127.0.0.1:3000/api/energie/ingest >/dev/null 2>&1\n"
)
sftp = c.open_sftp()
with sftp.file("/tmp/dash-energie.cron", "w") as f:
    f.write(line)
sftp.close()
run("crontab /tmp/dash-energie.cron && rm -f /tmp/dash-energie.cron")
print("crontab:\n", run("crontab -l"))
print("ingest:", run(f"curl -sf -m 15 -H 'Authorization: Bearer {secret}' http://127.0.0.1:3000/api/energie/ingest"))
print("historie:", run("curl -sf -m 15 http://127.0.0.1:3000/api/energie/historie")[:500])
c.close()
