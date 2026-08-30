#!/usr/bin/env python3
"""Deploy Tahoma-integratie naar .32: env, git reset, build, pm2, smoke-test."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent.parent
HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"
ENV_FILE = f"{APP}/.env.local"
BASE_URL = "https://192.168.1.128:8443"


def load_secrets() -> dict[str, str]:
    s: dict[str, str] = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            s[k.strip()] = v.strip()
    return s


def load_token() -> str:
    data = ROOT / "data" / "tahoma-settings.json"
    if data.is_file():
        token = json.loads(data.read_text(encoding="utf-8")).get("token", "").strip()
        if token:
            return token
    env_local = ROOT / ".env.local"
    if env_local.is_file():
        for line in env_local.read_text(encoding="utf-8").splitlines():
            if line.startswith("TAHOMA_TOKEN="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("Geen TAHOMA_TOKEN gevonden in data/ of .env.local")


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


def run(c: paramiko.SSHClient, cmd: str, wait: int = 300) -> tuple[str, int]:
    _, o, e = c.exec_command(cmd, timeout=wait)
    out = (o.read() + e.read()).decode("utf-8", errors="replace")
    code = o.channel.recv_exit_status()
    return out, code


def must(c: paramiko.SSHClient, cmd: str, wait: int = 300) -> str:
    out, code = run(c, cmd, wait=wait)
    print(out)
    if code != 0:
        raise SystemExit(f"FAILED ({code}): {cmd}")
    return out


def ensure_cron(c: paramiko.SSHClient) -> None:
    """Zet cron voor /api/tahoma/tick elke minuut (naast bestaande weer-sync)."""
    # Lees CRON_SECRET indien aanwezig; anders zonder auth (lokaal 127.0.0.1).
    env_out, _ = run(c, f"grep -E '^CRON_SECRET=' {ENV_FILE} || true")
    secret = ""
    for line in env_out.splitlines():
        if line.startswith("CRON_SECRET="):
            secret = line.split("=", 1)[1].strip()
    if secret:
        curl = (
            f'curl -sf -H "Authorization: Bearer {secret}" '
            f"http://127.0.0.1:3000/api/tahoma/tick"
        )
    else:
        curl = "curl -sf http://127.0.0.1:3000/api/tahoma/tick"

    marker = "api/tahoma/tick"
    cron_line = f"* * * * * {curl} >/dev/null 2>&1"
    # Behoud bestaande crontab, vervang alleen onze regel.
    existing, _ = run(c, "crontab -l 2>/dev/null || true")
    lines = [ln for ln in existing.splitlines() if marker not in ln and ln.strip()]
    lines.append(cron_line)
    payload = "\n".join(lines) + "\n"
    # Schrijf via stdin
    stdin, o, e = c.exec_command("crontab -", timeout=30)
    stdin.write(payload)
    stdin.channel.shutdown_write()
    out = (o.read() + e.read()).decode("utf-8", errors="replace")
    code = o.channel.recv_exit_status()
    if code != 0:
        print("crontab waarschuwing:", out)
    else:
        print("Cron-tick gezet:", cron_line.split(secret)[0] + ("***" if secret else "") + (cron_line.split(secret)[-1] if secret else ""))


def main() -> None:
    token = load_token()
    updates = {
        "TAHOMA_BASE_URL": BASE_URL,
        "TAHOMA_TOKEN": token,
    }
    print("Env updates:", ", ".join(updates.keys()))

    s = load_secrets()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)

    print("=== patch .env.local ===")
    patch_env_local(c.open_sftp(), updates)

    print("=== git sync origin/main ===")
    must(c, f"cd {APP} && git fetch origin")
    must(c, f"cd {APP} && git reset --hard origin/main")
    must(c, f"cd {APP} && git clean -fd")
    head, _ = run(c, f"cd {APP} && git rev-parse --short HEAD && git log -1 --oneline")
    print("=== deployed HEAD ===\n" + head)

    print("=== build ===")
    must(c, f"cd {APP} && rm -rf .next")
    must(c, f"cd {APP} && npm run build", wait=600)

    print("=== pm2 restart ===")
    must(c, f"cd {APP} && pm2 restart dash-next-app --update-env")
    time.sleep(5)

    print("=== cron ===")
    ensure_cron(c)

    print("=== smoke ===")
    status, _ = run(c, "curl -s -m 12 http://127.0.0.1:3000/api/tahoma/status")
    print("tahoma/status:", status[:500])
    devices, _ = run(c, "curl -s -m 12 http://127.0.0.1:3000/api/tahoma/devices")
    print("tahoma/devices:", devices[:400])
    live, _ = run(c, "curl -s -m 8 http://127.0.0.1:3000/api/weer/live")
    print("weer/live ok:", "temp_c" in live or "error" not in live[:80])

    c.close()
    print("Klaar.")


if __name__ == "__main__":
    main()
