#!/usr/bin/env python3
"""Waterverbruik sinds opgegeven stand (8-2-2026)."""
import sys
from datetime import date
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


def mysql(q: str) -> str:
    cmd = f"mysql -u root -p{s['SSH_PASS']} weerdata -e \"{q}\""
    _, o, e = c.exec_command(cmd, timeout=30)
    return (o.read() + e.read()).decode("utf-8", errors="replace")


print("=== verbruik sinds 8-2-2026 (max per dag uit metingen) ===")
print(
    mysql(
        "SELECT ROUND(SUM(dmax)/1000, 3) AS m3 FROM ("
        "SELECT MAX(water_dag_l) dmax FROM energie_metingen "
        "WHERE meet_moment >= '2026-02-08 00:00:00' "
        "GROUP BY DATE(meet_moment)) x"
    )
)
print("=== per maand ===")
print(
    mysql(
        "SELECT DATE_FORMAT(meet_moment,'%Y-%m') m, ROUND(SUM(dmax)/1000,2) m3 FROM ("
        "SELECT meet_moment, water_dag_l dmax FROM energie_metingen em "
        "JOIN (SELECT DATE(meet_moment) d, MAX(water_dag_l) mx FROM energie_metingen "
        "WHERE meet_moment >= '2026-02-08' GROUP BY DATE(meet_moment)) t "
        "ON DATE(em.meet_moment)=t.d AND em.water_dag_l=t.mx "
        "WHERE em.meet_moment >= '2026-02-08') z GROUP BY m ORDER BY m"
    )
)
c.close()

stand = date(2026, 2, 8)
vandaag = date.today()
dagen = (vandaag - stand).days
jaar_m3 = 53
geschat = 1404 + jaar_m3 * dagen / 365
print()
print(f"=== Schatting op basis 53 m3/jaar ===")
print(f"Dagen sinds 8-2-2026: {dagen}")
print(f"Verbruik geschat: {jaar_m3 * dagen / 365:.2f} m3")
print(f"Geschatte stand nu: {geschat:.1f} m3  (afgerond {round(geschat)} m3)")
