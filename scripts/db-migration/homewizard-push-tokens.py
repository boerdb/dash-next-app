#!/usr/bin/env python3
"""Zet opgeslagen tokens uit .homewizard-tokens.json op de server en herstart pm2."""
import json
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
TOKEN_FILE = SCRIPT_DIR / ".homewizard-tokens.json"
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


def patch_env_local(sftp: paramiko.SFTPClient, updates: dict[str, str]) -> None:
    try:
        with sftp.open(ENV_FILE, "r") as f:
            lines = f.read().decode("utf-8").splitlines()
    except OSError:
        lines = []
    keys = set(updates)
    out = [line for line in lines if line.split("=", 1)[0].strip() not in keys]
    for key, val in updates.items():
        out.append(f"{key}={val}")
    with sftp.open(ENV_FILE, "w") as f:
        f.write("\n".join(out) + "\n")


def main() -> None:
    if not TOKEN_FILE.is_file():
        print(f"Geen {TOKEN_FILE.name} — eerst homewizard-fetch-tokens.py draaien.")
        sys.exit(1)
    data = json.loads(TOKEN_FILE.read_text(encoding="utf-8"))
    updates: dict[str, str] = {
        "ENERGIE_BATTERY_URLS": "https://192.168.1.179,https://192.168.1.170",
    }
    if data.get("p1_token"):
        updates["ENERGIE_P1_TOKEN"] = data["p1_token"]
    bats = data.get("battery_tokens") or []
    if bats:
        updates["ENERGIE_BATTERY_TOKENS"] = ",".join(bats)

    if "ENERGIE_P1_TOKEN" not in updates and "ENERGIE_BATTERY_TOKENS" not in updates:
        print("Geen tokens in bestand.")
        sys.exit(1)

    print("Deploy:", ", ".join(updates.keys()))
    s = load_secrets()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
    patch_env_local(c.open_sftp(), updates)
    _, o, e = c.exec_command(
        f"cd {APP} && pm2 restart dash-next-app --update-env", timeout=30
    )
    print((o.read() + e.read()).decode("utf-8", errors="replace")[-500:])
    time.sleep(2)
    c.close()
    print("Klaar. Test: python scripts/db-migration/homewizard-verify-tokens.py")


if __name__ == "__main__":
    main()
