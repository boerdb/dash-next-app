#!/usr/bin/env python3
"""Zet Enphase-config + token op .32 en herstart pm2."""
import json
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
TOKEN_FILE = SCRIPT_DIR / ".enphase-token.txt"
HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"
ENV_FILE = f"{APP}/.env.local"
DEFAULT_SERIAL = "122310038998"
DEFAULT_GATEWAY = "https://192.168.1.163"


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
        print(f"Geen {TOKEN_FILE.name} — eerst enphase-fetch-token.py draaien.")
        sys.exit(1)

    token = TOKEN_FILE.read_text(encoding="utf-8").strip()
    if len(token) < 20:
        print("Token te kort of leeg.")
        sys.exit(1)

    updates = {
        "ENPHASE_GATEWAY_URL": DEFAULT_GATEWAY,
        "ENPHASE_GATEWAY_SERIAL": DEFAULT_SERIAL,
        "ENPHASE_GATEWAY_TOKEN": token,
    }
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
    time.sleep(3)
    _, o, e = c.exec_command(
        "curl -s -m 10 http://127.0.0.1:3000/api/energie/live | python3 -c "
        "\"import sys,json; d=json.load(sys.stdin); e=d.get('enphase'); "
        "print('enphase:', e if e else 'geen veld (code nog niet gedeployed?)')\"",
        timeout=20,
    )
    print((o.read() + e.read()).decode("utf-8", errors="replace"))
    c.close()
    print("Klaar.")


if __name__ == "__main__":
    main()
