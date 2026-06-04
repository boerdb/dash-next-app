#!/usr/bin/env python3
"""
Interactief: HomeWizard-tokens ophalen via SSH op .32 en in .env.local zetten.

Per apparaat: Local API aan in de app → knop op apparaat → Enter in deze terminal.
"""
import json
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"
ENV_FILE = f"{APP}/.env.local"

DEVICES = [
    ("192.168.1.178", "P1 meter"),
    ("192.168.1.179", "Batterij .179"),
    ("192.168.1.170", "Batterij .170"),
]


def load_secrets() -> dict[str, str]:
    s: dict[str, str] = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            s[k.strip()] = v.strip()
    return s


def request_token(ssh: paramiko.SSHClient, ip: str) -> str | None:
    for scheme in ("http", "https"):
        url = f"{scheme}://{ip}/api/v1/token"
        cmd = f"curl -sk -m 15 -X POST '{url}'"
        _, o, e = ssh.exec_command(cmd, timeout=20)
        raw = (o.read() + e.read()).decode("utf-8", errors="replace").strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
            token = data.get("token")
            if isinstance(token, str) and token:
                print(f"  Token ontvangen via {url}")
                return token
        except json.JSONDecodeError:
            print(f"  Antwoord ({url}): {raw[:120]}")
    return None


def patch_env_local(sftp: paramiko.SFTPClient, updates: dict[str, str]) -> None:
    try:
        with sftp.open(ENV_FILE, "r") as f:
            lines = f.read().decode("utf-8").splitlines()
    except OSError:
        lines = []

    keys = set(updates)
    out: list[str] = []
    for line in lines:
        key = line.split("=", 1)[0].strip() if "=" in line else ""
        if key in keys:
            continue
        out.append(line)
    for key, val in updates.items():
        out.append(f"{key}={val}")
    with sftp.open(ENV_FILE, "w") as f:
        f.write("\n".join(out) + "\n")


def main() -> None:
    s = load_secrets()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)

    p1_token: str | None = None
    bat_tokens: list[str] = []

    for ip, name in DEVICES:
        print(f"\n{'=' * 50}")
        print(f"  {name}  ({ip})")
        print("=" * 50)
        print("1. HomeWizard-app → Instellingen → Meters → dit apparaat → Local API → AAN")
        print("2. Druk op de knop op het apparaat")
        input("3. Druk Enter hier als de knop is ingedrukt (binnen 60 s)... ")

        token = request_token(c, ip)
        if not token:
            print("  MISLUKT — overslaan of opnieuw proberen.")
            retry = input("  Opnieuw? (j/N): ").strip().lower()
            if retry == "j":
                token = request_token(c, ip)
        if token:
            if ip.endswith(".178"):
                p1_token = token
            else:
                bat_tokens.append(token)
        else:
            manual = input("  Token handmatig plakken (Enter = overslaan): ").strip()
            if manual:
                if ip.endswith(".178"):
                    p1_token = manual
                else:
                    bat_tokens.append(manual)

    updates: dict[str, str] = {
        "ENERGIE_BATTERY_URLS": "https://192.168.1.179,https://192.168.1.170",
    }
    if p1_token:
        updates["ENERGIE_P1_TOKEN"] = p1_token
    if bat_tokens:
        updates["ENERGIE_BATTERY_TOKENS"] = ",".join(bat_tokens)

    if len(updates) > 1:
        print(f"\nSchrijf naar {ENV_FILE}:")
        for k, v in updates.items():
            masked = v[:8] + "…" if len(v) > 12 else v
            print(f"  {k}={masked}")
        ok = input("Opslaan op server? (J/n): ").strip().lower()
        if ok != "n":
            patch_env_local(c.open_sftp(), updates)
            print("Opgeslagen.")
            _, o, e = c.exec_command(
                f"cd {APP} && pm2 restart dash-next-app --update-env", timeout=30
            )
            print((o.read() + e.read()).decode("utf-8", errors="replace")[-400:])
            time.sleep(3)
    else:
        print("Geen tokens om op te slaan.")

    c.close()
    print("\nVerificatie: python scripts/db-migration/homewizard-verify-tokens.py")


if __name__ == "__main__":
    main()
