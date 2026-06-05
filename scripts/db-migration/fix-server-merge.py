#!/usr/bin/env python3
"""Reset server working tree naar origin/main (na handmatige deploy-conflict)."""
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"
SCRIPT_DIR = Path(__file__).resolve().parent


def load_secrets() -> dict[str, str]:
    s: dict[str, str] = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            s[k.strip()] = v.strip()
    return s


def main() -> None:
    s = load_secrets()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)

    def run(cmd: str, timeout: int = 600) -> str:
        _, o, e = c.exec_command(cmd, timeout=timeout)
        return (o.read() + e.read()).decode("utf-8", errors="replace")

    print("=== ENPHASE in .env.local vóór fix ===")
    print(run(f"grep ENPHASE {APP}/.env.local 2>/dev/null || echo geen"))

    print("=== fetch + reset + clean ===")
    print(run(f"cd {APP} && git fetch origin && git reset --hard origin/main"))
    print(run(f"cd {APP} && git clean -fd"))
    print(run(f"cd {APP} && git status"))
    print(run(f"cd {APP} && git log -1 --oneline"))

    print("=== build ===")
    print(run(f"cd {APP} && npm run build", timeout=600))

    print("=== pm2 restart ===")
    print(run(f"cd {APP} && pm2 restart dash-next-app --update-env"))
    time.sleep(4)

    print("=== ENPHASE na fix ===")
    print(run(f"grep ENPHASE {APP}/.env.local 2>/dev/null || echo geen"))
    print(run(f"curl -s -m 15 http://127.0.0.1:3000/api/energie/live | head -c 500"))
    print(run(f"curl -s -m 10 http://127.0.0.1:3000/api/weer/astronomie | head -c 300"))

    c.close()
    print("Klaar.")


if __name__ == "__main__":
    main()
