#!/usr/bin/env python3
"""Zet energie-ingest cron op Next-host (192.168.1.32). Vereist .secrets.local."""
import secrets
import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"
SCRIPT_DIR = Path(__file__).resolve().parent
CRON_MARKER = "api/energie/ingest"

s: dict[str, str] = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()


def run(c: paramiko.SSHClient, cmd: str, timeout: int = 120) -> str:
    _, o, e = c.exec_command(cmd, timeout=timeout)
    return (o.read() + e.read()).decode("utf-8", errors="replace")


def main() -> None:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)

    print("==> Huidige crontab")
    print(run(c, "crontab -l 2>/dev/null || echo '(leeg)'"))

    print("==> CRON_SECRET in .env.local")
    env_path = f"{APP}/.env.local"
    secret = run(c, f"grep '^CRON_SECRET=' {env_path} 2>/dev/null | cut -d= -f2-").strip()
    if not secret:
        secret = secrets.token_urlsafe(24)
        run(
            c,
            f"touch {env_path} && grep -q '^CRON_SECRET=' {env_path} 2>/dev/null || "
            f"echo 'CRON_SECRET={secret}' >> {env_path}",
        )
        print(f"   Nieuw secret toegevoegd aan {env_path}")
    else:
        print("   Bestaand secret behouden")

    secret = run(c, f"grep '^CRON_SECRET=' {env_path} | cut -d= -f2-").strip()
    cron_line = (
        f"*/5 * * * * curl -sf -H 'Authorization: Bearer {secret}' "
        f"http://127.0.0.1:3000/api/energie/ingest >/dev/null"
    )

    print("==> Crontab bijwerken")
    # Schrijf regel via heredoc (voorkomt kapotte quotes in echo)
    cron_cmd = (
        f"crontab -l 2>/dev/null | grep -v '{CRON_MARKER}' | grep -v '^$' > /tmp/cron.tmp || true; "
        f"printf '%s\\n' '{cron_line}' >> /tmp/cron.tmp; "
        f"crontab /tmp/cron.tmp; rm -f /tmp/cron.tmp; crontab -l"
    )
    print(run(c, cron_cmd))

    print("==> PM2 herstart (laadt .env.local)")
    print(run(c, f"cd {APP} && pm2 restart dash-next-app --update-env 2>&1 || true"))
    import time

    time.sleep(4)

    print("==> Test ingest")
    test = run(
        c,
        f"curl -sf -m 15 -H 'Authorization: Bearer {secret}' "
        f"http://127.0.0.1:3000/api/energie/ingest",
    )
    print(test.strip() or "(geen output)")

    print("==> Laatste energie_metingen")
    sql = (
        "SELECT meet_moment, actueel_vermogen_w FROM energie_metingen "
        "ORDER BY meet_moment DESC LIMIT 3;"
    )
    print(
        run(
            c,
            f"mysql -h 192.168.1.14 -u dash_app -pkerkpoort weerdata -e \"{sql}\" 2>/dev/null",
        )
    )

    c.close()
    print("\nKlaar. Energie-historie vult elke 5 min (ook zonder open dashboard).")


if __name__ == "__main__":
    main()
