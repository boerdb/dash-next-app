#!/usr/bin/env python3
"""Lees watermeterstand via HomeWizard (.169) en energie_dagstart."""
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


def run(cmd: str, timeout: int = 20) -> str:
    _, o, e = c.exec_command(cmd, timeout=timeout)
    return (o.read() + e.read()).decode("utf-8", errors="replace")


raw = run("curl -sf -m 10 http://192.168.1.169/api/v1/data")
print("=== HomeWizard water (.169) ===")
print(raw)

try:
    data = json.loads(raw)
    total_m3 = float(data.get("total_liter_m3", 0))
    total_l = round(total_m3 * 1000)
    black = data.get("total_liter_m3", "—")
    flow = data.get("active_liter_lpm", 0)
    print()
    print(f"Totaal cumulatief: {total_m3:.3f} m³  (= {total_l} liter)")
    print(f"Actuele flow: {flow} L/min")
except json.JSONDecodeError:
    print("Kon JSON niet parsen")

live = run("curl -sf -m 15 http://127.0.0.1:3000/api/energie/live")
try:
    d = json.loads(live)
    print()
    print("=== Dashboard (energie/live) ===")
    print(f"Water vandaag: {d.get('water_vandaag')} L")
    print(f"Flow nu: {d.get('water_actueel')} L/min")
except json.JSONDecodeError:
    pass

db = run(
    f"mysql -u root -p{s['SSH_PASS']} weerdata -N -e "
    "\"SELECT JSON_EXTRACT(payload,'$.water_start'), JSON_EXTRACT(payload,'$.date') "
    "FROM energie_dagstart WHERE id=1\""
)
if db.strip():
    parts = db.strip().split("\t")
    if len(parts) >= 1:
        ws = float(parts[0])
        print()
        print(f"=== Referentie dagstart ({parts[1] if len(parts) > 1 else '?'}) ===")
        print(f"water_start: {ws:.3f} m³ = {round(ws * 1000)} L")

c.close()
