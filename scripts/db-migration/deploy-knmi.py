#!/usr/bin/env python3
"""Push-ready deploy: KNMI env op .32, git pull, build, pm2 restart, smoke tests."""
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
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


def load_local_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for path in (REPO_ROOT / ".env.local", REPO_ROOT / ".env"):
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


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

    for key, value in updates.items():
        if value:
            out.append(f"{key}={value}")

    content = "\n".join(out).rstrip() + "\n"
    with sftp.open(ENV_FILE, "w") as f:
        f.write(content.encode("utf-8"))


def main() -> None:
    local = load_local_env()
    knmi_key = local.get("KNMI_API_KEY", "").strip()
    if not knmi_key:
        print("Geen KNMI_API_KEY in .env of .env.local — afbreken.")
        sys.exit(1)

    updates = {
        "KNMI_API_KEY": knmi_key,
        "KNMI_PROVINCE": local.get("KNMI_PROVINCE", "FR").strip() or "FR",
    }

    s = load_secrets()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)

    def run(cmd: str, wait: int = 600) -> str:
        _, o, e = c.exec_command(cmd, timeout=wait)
        return (o.read() + e.read()).decode("utf-8", errors="replace")

    print("==> KNMI vars in .env.local")
    patch_env_local(c.open_sftp(), updates)

    print(run(f"cd {APP} && git fetch origin && git reset --hard origin/main"))
    print(run(f"cd {APP} && npm run build", wait=600))
    print(run(f"cd {APP} && pm2 restart dash-next-app --update-env"))
    time.sleep(4)

    print("==> knmi-waarschuwingen:")
    print(run("curl -sf -m 20 http://127.0.0.1:3000/api/weer/knmi-waarschuwingen")[:500])
    print("==> openweather (snippet):")
    print(run("curl -sf -m 15 http://127.0.0.1:3000/api/weer/openweather")[:200])
    c.close()
    print("\nDeploy klaar.")


if __name__ == "__main__":
    main()
