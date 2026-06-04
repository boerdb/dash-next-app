#!/usr/bin/env python3
"""Zoek watermeter-beginstand / offset in MariaDB (.14)."""
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
c.connect(s["DB_HOST"], username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)


def mysql(db: str, q: str) -> str:
    cmd = f"mysql -u root -p{s['SSH_PASS']} {db} -e \"{q}\""
    _, o, e = c.exec_command(cmd, timeout=30)
    return (o.read() + e.read()).decode("utf-8", errors="replace")


print("=== energie_dagstart (water_start) ===")
print(mysql("weerdata", "SELECT updated_at, JSON_EXTRACT(payload,'$.date') AS dag, JSON_EXTRACT(payload,'$.water_start') AS water_start_m3 FROM energie_dagstart WHERE id=1"))

print("=== oudste energie_metingen met water ===")
print(
    mysql(
        "weerdata",
        "SELECT meet_moment, water_dag_l, water_actueel_lpm FROM energie_metingen "
        "WHERE water_dag_l > 0 OR water_actueel_lpm > 0 ORDER BY meet_moment ASC LIMIT 5",
    )
)

print("=== tabellen met 'water' in weerdata ===")
print(mysql("weerdata", "SHOW TABLES LIKE '%water%'"))

print("=== kolommen energie_metingen ===")
print(mysql("weerdata", "SHOW COLUMNS FROM energie_metingen"))

print("=== databases ===")
print(mysql("information_schema", "SELECT SCHEMA_NAME FROM SCHEMATA WHERE SCHEMA_NAME NOT IN ('information_schema','mysql','performance_schema','sys')"))

for db in ["personen_db", "ic_labels_db"]:
    print(f"=== tabellen {db} (water/liter) ===")
    print(mysql(db, f"SHOW TABLES"))

print("=== HomeWizard offset op apparaat (.169 via .32) ===")
c32 = paramiko.SSHClient()
c32.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c32.connect("192.168.1.32", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
_, o, e = c32.exec_command("curl -sf -m 10 http://192.168.1.169/api/v1/data", timeout=15)
print((o.read() + e.read()).decode("utf-8", errors="replace"))
print("=== som dagmaxima water (liter) sinds april ===")
print(
    mysql(
        "weerdata",
        "SELECT ROUND(SUM(dmax),0) totaal_l FROM (SELECT MAX(water_dag_l) dmax "
        "FROM energie_metingen WHERE meet_moment >= '2026-04-01' "
        "GROUP BY DATE(meet_moment)) x",
    )
)
print("=== eerste meetdag ===")
print(mysql("weerdata", "SELECT MIN(DATE(meet_moment)) FROM energie_metingen"))

c32.close()
