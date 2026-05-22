#!/usr/bin/env python3
import sys
import time
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
APP = "/var/www/dash-next-app"
s = {}
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


print(run(f"cd {APP} && git pull"))
print(run(f"cd {APP} && npm run build", timeout=600))
print(run(f"cd {APP} && pm2 restart dash-next-app --update-env"))
time.sleep(5)
print("ingest:", run(
    "curl -s -m 10 'http://127.0.0.1:3000/api/weer/ingest?tempf=75&temp2f=77&humidity=65&windspeedmph=1&windspdmph_avg10m=1&winddir=180&solarradiation=400&dailyrainin=0'"
))
print("live:", run("curl -s -m 10 http://127.0.0.1:3000/api/weer/live")[:280])
print("historie:", run("curl -s -m 10 http://127.0.0.1:3000/api/weer/historie")[:280])
print(
    run(
        f"mysql -h 192.168.1.14 -u dash_app -pkerkpoort weerdata -e "
        "\"SELECT meet_moment,temp_c FROM metingen ORDER BY meet_moment DESC LIMIT 3;\""
    )
)
c.close()
