#!/usr/bin/env python3
"""Diagnose HomeWizard token-pairing op LAN."""
import json
from pathlib import Path
import paramiko

s = {}
for line in (Path(__file__).parent / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

body = json.dumps({"name": "local/dash-next-app"})
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.32", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)


def run(cmd: str) -> str:
    _, o, e = c.exec_command(cmd, timeout=15)
    return (o.read() + e.read()).decode("utf-8", errors="replace").strip()


print("=== Bereikbaarheid ===")
for ip in ("192.168.1.178", "192.168.1.179", "192.168.1.170"):
    print(ip, "ping:", run(f"ping -c 1 -W 2 {ip} | tail -1"))

print("\n=== P1 v1 data (zonder token) ===")
print(run("curl -sf -m 5 http://192.168.1.178/api/v1/data | head -c 120") or "FAIL")

print("\n=== P1 v2 /api (zonder token) ===")
print(run("curl -sk -m 5 https://192.168.1.178/api -H 'X-Api-Version: 2'")[:200])

print("\n=== POST /api/user (verwacht 403 = wacht op knop) ===")
for ip in ("192.168.1.178", "192.168.1.179", "192.168.1.170"):
    out = run(
        f"curl -sk -m 8 -w ' HTTP:%{{http_code}}' -X POST 'https://{ip}/api/user' "
        f"-H 'Content-Type: application/json' -H 'X-Api-Version: 2' -d '{body}'"
    )
    print(f"{ip}: {out}")

print("\n=== Bestaande users op P1 (als er al een token is) ===")
print("(alleen met token — overslaan als 401)")

print("\n=== mDNS / hostname hint ===")
print(run("avahi-browse -atr 2>/dev/null | grep -i homewizard | head -5") or "geen avahi")

c.close()
