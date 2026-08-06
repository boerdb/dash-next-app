#!/usr/bin/env python3
"""Zet HUE_BRIDGE_IP en HUE_USERNAME in .env.local op .32 (backup na UI-koppeling)."""
import json
import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"
ENV_FILE = f"{APP}/.env.local"
SETTINGS_FILE = f"{APP}/data/hue-settings.json"
SCRIPT_DIR = Path(__file__).resolve().parent


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
    out.append("")
    out.append("# Philips Hue Bridge (lokaal)")
    for key, val in updates.items():
        out.append(f"{key}={val}")
    with sftp.open(ENV_FILE, "w") as f:
        f.write("\n".join(out).strip() + "\n")


def main() -> None:
    s = load_secrets()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
    sftp = c.open_sftp()

    with sftp.open(SETTINGS_FILE, "r") as f:
        settings = json.loads(f.read().decode("utf-8"))

    bridge_ip = settings.get("bridgeIp", "192.168.1.76")
    username = settings.get("username", "")
    if not username:
        print("Geen username in hue-settings.json — eerst koppelen in de app.")
        sys.exit(1)

    patch_env_local(
        sftp,
        {
            "HUE_BRIDGE_IP": bridge_ip,
            "HUE_USERNAME": username,
        },
    )
    sftp.close()

    _, o, _ = c.exec_command("pm2 restart dash-next-app --update-env", timeout=30)
    o.channel.recv_exit_status()
    print(f"HUE_BRIDGE_IP={bridge_ip}")
    print(f"HUE_USERNAME={username[:8]}… (opgeslagen in .env.local)")
    print("PM2 herstart — klaar.")
    c.close()


if __name__ == "__main__":
    main()
