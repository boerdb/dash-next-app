#!/usr/bin/env python3
"""Test HomeWizard-tokens vanaf de Next-server (.32) tegen v2-endpoints."""
import json
import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"
ENV_FILE = f"{APP}/.env.local"


def load_secrets() -> dict[str, str]:
    s: dict[str, str] = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            s[k.strip()] = v.strip()
    return s


def read_remote_env(ssh: paramiko.SSHClient) -> dict[str, str]:
    _, o, _ = ssh.exec_command(f"grep -E '^ENERGIE_(P1|BATTERY)' {ENV_FILE} 2>/dev/null", timeout=10)
    env: dict[str, str] = {}
    for line in o.read().decode("utf-8", errors="replace").splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def curl_v2(ssh: paramiko.SSHClient, url: str, token: str) -> dict | None:
    cmd = (
        f"curl -sk -m 10 '{url}' "
        f"-H 'Authorization: Bearer {token}' "
        f"-H 'X-Api-Version: 2'"
    )
    _, o, _ = ssh.exec_command(cmd, timeout=15)
    raw = o.read().decode("utf-8", errors="replace").strip()
    if not raw.startswith("{"):
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def main() -> None:
    s = load_secrets()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)

    env = read_remote_env(c)
    p1_token = env.get("ENERGIE_P1_TOKEN", "")
    bat_tokens = [
        t.strip()
        for t in env.get("ENERGIE_BATTERY_TOKENS", "").split(",")
        if t.strip()
    ]
    bat_urls = [
        u.strip()
        for u in env.get(
            "ENERGIE_BATTERY_URLS",
            "https://192.168.1.179,https://192.168.1.170",
        ).split(",")
        if u.strip()
    ]

    print("=== P1 /api/batteries ===")
    if p1_token:
        data = curl_v2(c, "https://192.168.1.178/api/batteries", p1_token)
        print(json.dumps(data, indent=2) if data else "GEEN ANTWOORD / ongeldige token")
    else:
        print("ENERGIE_P1_TOKEN ontbreekt in .env.local")

    for i, base in enumerate(bat_urls):
        host = base.replace("https://", "").replace("http://", "").split("/")[0]
        token = bat_tokens[i] if i < len(bat_tokens) else bat_tokens[0] if bat_tokens else ""
        print(f"\n=== Batterij {host} /api/measurement ===")
        if not token:
            print("Geen token")
            continue
        data = curl_v2(c, f"https://{host}/api/measurement", token)
        if data:
            print(
                json.dumps(
                    {
                        "state_of_charge_pct": data.get("state_of_charge_pct"),
                        "power_w": data.get("power_w"),
                    },
                    indent=2,
                )
            )
        else:
            print("GEEN ANTWOORD / ongeldige token")

    print("\n=== /api/energie/live (dashboard) ===")
    _, o, _ = c.exec_command("curl -sf -m 12 http://127.0.0.1:3000/api/energie/live", timeout=15)
    live = o.read().decode("utf-8", errors="replace")
    try:
        d = json.loads(live)
        print("batterijen:", json.dumps(d.get("batterijen"), indent=2))
        print("batterij_groep:", d.get("batterij_groep"))
        print("hint:", d.get("batterij_hint"))
    except json.JSONDecodeError:
        print(live[:400])

    c.close()


if __name__ == "__main__":
    main()
