#!/usr/bin/env python3
"""Alleen token voor batterij 192.168.1.179; behoudt P1 + .170 op de server."""
import json
import re
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"
ENV_FILE = f"{APP}/.env.local"
IP_179 = "192.168.1.179"
USER_NAME = "local/dash-next-app"
POLL_INTERVAL_S = 2
POLL_TIMEOUT_S = 120


def load_secrets() -> dict[str, str]:
    s: dict[str, str] = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            s[k.strip()] = v.strip()
    return s


def read_env_var(ssh: paramiko.SSHClient, key: str) -> str:
    _, o, _ = ssh.exec_command(f"grep -E '^{key}=' {ENV_FILE} 2>/dev/null | tail -1", timeout=10)
    line = o.read().decode("utf-8", errors="replace").strip()
    if "=" in line:
        return line.split("=", 1)[1].strip()
    return ""


def try_create_user(ssh: paramiko.SSHClient, ip: str) -> tuple[str | None, str]:
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
    if "user:creation-not-enabled" in raw or "HTTP_CODE:403" in raw:
        return None, "wacht op knop — druk op touchknop batterij .179"
    return None, raw[:120] if raw else "geen antwoord"


def patch_env_key(sftp: paramiko.SFTPClient, key: str, value: str) -> None:
    try:
        with sftp.open(ENV_FILE, "r") as f:
            lines = f.read().decode("utf-8").splitlines()
    except OSError:
        lines = []
    out = [line for line in lines if not line.startswith(f"{key}=")]
    out.append(f"{key}={value}")
    with sftp.open(ENV_FILE, "w") as f:
        f.write("\n".join(out) + "\n")


def main() -> None:
    s = load_secrets()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)

    existing = read_env_var(c, "ENERGIE_BATTERY_TOKENS")
    tokens = [t.strip() for t in existing.split(",") if t.strip()]
    token_170 = tokens[1] if len(tokens) > 1 else (tokens[0] if tokens else "")

    print("=" * 50)
    print("  Batterij .179  (192.168.1.179)")
    print("=" * 50)
    print("1. HomeWizard-app → Meters → batterij met IP .179 → Local API → AAN")
    print("2. Kort op de touchknop op die batterij (vaak piep)")
    choice = input("Enter = start polling (120s), p = token plakken: ").strip().lower()

    token_179: str | None = None
    if choice == "p":
        token_179 = input("Plak token .179: ").strip() or None
    else:
        print("Polling…\n")
        deadline = time.time() + POLL_TIMEOUT_S
        last = ""
        while time.time() < deadline:
            token_179, msg = try_create_user(c, IP_179)
            if token_179:
                print(f"OK: {token_179[:8]}…")
                break
            if msg != last:
                print(f"  … {msg}")
                last = msg
            time.sleep(POLL_INTERVAL_S)
        if not token_179:
            token_179 = input("Timeout. Plak token (Enter = stop): ").strip() or None

    if not token_179:
        print("Geen token — niets gewijzigd.")
        c.close()
        sys.exit(1)

    if not token_170:
        print("Waarschuwing: geen .170-token in .env.local; alleen .179-token gezet.")
        combined = token_179
    else:
        combined = f"{token_179},{token_170}"

    patch_env_key(c.open_sftp(), "ENERGIE_BATTERY_TOKENS", combined)
    print(f"ENERGIE_BATTERY_TOKENS bijgewerkt (179 + 170).")
    _, o, e = c.exec_command(
        f"cd {APP} && pm2 restart dash-next-app --update-env", timeout=30
    )
    print((o.read() + e.read()).decode("utf-8", errors="replace")[-350:])
    time.sleep(2)
    c.close()
    print("\nTest: python scripts/db-migration/homewizard-verify-tokens.py")


if __name__ == "__main__":
    main()
