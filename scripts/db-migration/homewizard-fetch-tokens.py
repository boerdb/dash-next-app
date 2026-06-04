#!/usr/bin/env python3
"""
Interactief: HomeWizard API v2-tokens ophalen via SSH op .32.

Endpoint: POST https://<IP>/api/user  (niet /api/v1/token)
Body: {"name": "local/dash-next-app"}
Headers: X-Api-Version: 2

Druk kort op de knop op het apparaat terwijl het script pollt (±2 min venster).
"""
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
USER_NAME = "local/dash-next-app"
POLL_INTERVAL_S = 2
POLL_TIMEOUT_S = 120

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


def try_create_user(ssh: paramiko.SSHClient, ip: str) -> tuple[str | None, str]:
    """Returns (token, status_message)."""
    body = json.dumps({"name": USER_NAME}).replace("'", "'\\''")
    cmd = (
        f"curl -sk -m 10 -w '\\nHTTP_CODE:%{{http_code}}' "
        f"-X POST 'https://{ip}/api/user' "
        f"-H 'Content-Type: application/json' "
        f"-H 'X-Api-Version: 2' "
        f"-d '{body}'"
    )
    _, o, e = ssh.exec_command(cmd, timeout=15)
    raw = (o.read() + e.read()).decode("utf-8", errors="replace").strip()
    if "HTTP_CODE:200" in raw:
        json_part = raw.split("HTTP_CODE:")[0].strip()
        try:
            data = json.loads(json_part)
            token = data.get("token")
            if isinstance(token, str) and token:
                return token, "token ontvangen"
        except json.JSONDecodeError:
            pass
    if "user:creation-not-enabled" in raw:
        return None, "wacht op knop"
    if "HTTP_CODE:403" in raw:
        return None, "wacht op knop (403)"
    return None, raw[:100] if raw else "geen antwoord"


def save_tokens_file(p1_token: str | None, bat_tokens: list[str]) -> None:
    TOKEN_FILE.write_text(
        json.dumps(
            {"p1_token": p1_token, "battery_tokens": bat_tokens},
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"  (tussentijds opgeslagen in {TOKEN_FILE.name})")


def poll_token(ssh: paramiko.SSHClient, ip: str, name: str) -> str | None:
    print(f"\n{'=' * 50}")
    print(f"  {name}  ({ip})")
    print("=" * 50)
    print("1. HomeWizard-app → Instellingen → Meters → DIT apparaat → Local API → AAN")
    if "P1" in name:
        print("2. Kort (~1 s) op de witte knop op de P1-meter")
    else:
        print("2. Kort op de zwarte touchknop op de batterij (niet de P1-knop)")
        print("   Vaak hoor je een piep. Selecteer in de app de batterij, niet de P1.")
    choice = input(
        f"Enter = start {POLL_TIMEOUT_S}s polling, s = overslaan, p = plak token: "
    ).strip().lower()
    if choice == "s":
        return None
    if choice == "p":
        manual = input("  Plak token: ").strip()
        return manual or None

    print(f"3. Polling gestart — druk nu op de knop…\n")

    deadline = time.time() + POLL_TIMEOUT_S
    last_msg = ""
    while time.time() < deadline:
        token, msg = try_create_user(ssh, ip)
        if token:
            print(f"  OK: token ontvangen ({token[:8]}…)")
            return token
        if msg != last_msg:
            print(f"  … {msg}")
            last_msg = msg
        time.sleep(POLL_INTERVAL_S)

    print("  Timeout — geen token. Probeer opnieuw of plak token uit de app.")
    manual = input("  Token handmatig plakken (Enter = overslaan): ").strip()
    return manual or None


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
        token = poll_token(c, ip, name)
        if not token:
            continue
        if ip.endswith(".178"):
            p1_token = token
        else:
            bat_tokens.append(token)
        save_tokens_file(p1_token, bat_tokens)

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
