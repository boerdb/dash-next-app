#!/usr/bin/env python3
from pathlib import Path
import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent
s = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(s["DB_HOST"], username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)


def mysql(q: str) -> str:
    cmd = f"mysql -u root -p{s['SSH_PASS']} weerdata -e \"{q}\""
    _, o, e = c.exec_command(cmd, timeout=20)
    return (o.read() + e.read()).decode("utf-8", errors="replace")


print("=== energie_dag_totalen ===")
print(mysql("SELECT dag, net_in_kwh, net_uit_kwh, batterij_kwh FROM energie_dag_totalen ORDER BY dag DESC LIMIT 10"))
print("=== dagstart ===")
print(mysql("SELECT payload FROM energie_dagstart WHERE id=1"))
print("=== metingen max per dag jun ===")
print(
    mysql(
        "SELECT DATE(CONVERT_TZ(meet_moment,'+00:00','+02:00')) AS d, "
        "ROUND(MAX(stroom_in_kwh),2) AS in_kwh, ROUND(MAX(stroom_uit_kwh),2) AS uit_kwh "
        "FROM energie_metingen WHERE meet_moment >= '2026-06-01' "
        "GROUP BY d ORDER BY d"
    )
)
c.close()
