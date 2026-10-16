#!/usr/bin/env python3
import shlex
from pathlib import Path
import paramiko

from homelab import secret, ssh_key_kwargs

SCRIPT_DIR = Path(__file__).resolve().parent
s = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

host = "192.168.1.32"
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=s["SSH_USER"], timeout=15, **ssh_key_kwargs())
cmds = [
    "test -f /var/www/dash-next-app/.env.local && grep -E '^(DATABASE_URL|WEER_API)' /var/www/dash-next-app/.env.local || echo 'NO .env.local keys'",
    "cd /var/www/dash-next-app && git log -1 --oneline",
    "curl -s -m 5 'http://127.0.0.1:3000/api/weer/ingest?tempf=75.2&humidity=70'",
    f"mysql -h 192.168.1.14 -u dash_app -p{shlex.quote(secret('DASH_APP_DB_PASS'))} weerdata -e \"SELECT updated_at, JSON_EXTRACT(payload,'$.temp_c') AS temp_c, JSON_EXTRACT(payload,'$.temp2f') AS temp2f FROM weer_live WHERE id=1\" 2>/dev/null || echo mysql_skip",
]
for cmd in cmds:
    _, o, e = c.exec_command(cmd)
    out = (o.read() + e.read()).decode().strip()
    print(f">>> {cmd}\n{out}\n")
c.close()
