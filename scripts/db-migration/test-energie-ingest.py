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

for host, label in [("192.168.1.32", "next"), ("192.168.1.14", "db")]:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)

    def run(cmd: str) -> str:
        _, o, e = c.exec_command(cmd, timeout=60)
        return (o.read() + e.read()).decode("utf-8", errors="replace")

    print(f"=== {label} ({host}) ===")
    if host.endswith("32"):
        secret = run(
            "grep '^CRON_SECRET=' /var/www/dash-next-app/.env.local | cut -d= -f2-"
        ).strip()
        print(
            "ingest:",
            run(
                f"curl -s -m 20 -H 'Authorization: Bearer {secret}' "
                "http://127.0.0.1:3000/api/energie/ingest"
            ),
        )
        print(
            "ingest verbose:",
            run(
                f"curl -s -m 20 -w '\\nHTTP %{{http_code}}' -H 'Authorization: Bearer {secret}' "
                "http://127.0.0.1:3000/api/energie/ingest"
            ),
        )
    sql = (
        "SELECT meet_moment, actueel_vermogen_w FROM energie_metingen "
        "ORDER BY meet_moment DESC LIMIT 3;"
    )
    if label == "db":
        print(run(f"mysql -u root -p{s['SSH_PASS']} weerdata -e \"{sql}\""))
    c.close()
