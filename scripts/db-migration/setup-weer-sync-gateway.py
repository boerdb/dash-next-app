#!/usr/bin/env python3
"""ECOWITT_GATEWAY_URL + sync-gateway cron op .32."""
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"
ENV_PATH = f"{APP}/.env.local"
GATEWAY_URL = "http://192.168.1.150"
CRON_MARKER = "api/weer/sync-gateway"

SCRIPT_DIR = Path(__file__).resolve().parent
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

    print("==> ECOWITT_GATEWAY_URL in .env.local")
    has = run(c, f"grep '^ECOWITT_GATEWAY_URL=' {ENV_PATH} 2>/dev/null").strip()
    if has:
        run(
            c,
            f"sed -i 's|^ECOWITT_GATEWAY_URL=.*|ECOWITT_GATEWAY_URL={GATEWAY_URL}|' {ENV_PATH}",
        )
        print(f"   Bijgewerkt: {GATEWAY_URL}")
    else:
        run(c, f"echo 'ECOWITT_GATEWAY_URL={GATEWAY_URL}' >> {ENV_PATH}")
        print(f"   Toegevoegd: {GATEWAY_URL}")

    secret = run(c, f"grep '^CRON_SECRET=' {ENV_PATH} | cut -d= -f2-").strip()
    if not secret:
        print("   Geen CRON_SECRET — sync-gateway cron zonder auth")
        cron_line = (
            "* * * * * curl -sf http://127.0.0.1:3000/api/weer/sync-gateway >/dev/null 2>&1\n"
        )
    else:
        cron_line = (
            f"* * * * * curl -sf -H 'Authorization: Bearer {secret}' "
            f"http://127.0.0.1:3000/api/weer/sync-gateway >/dev/null 2>&1\n"
        )

    print("==> Crontab sync-gateway (elke minuut)")
    import base64

    cron_b64 = base64.b64encode(cron_line.encode()).decode()
    cron_cmd = (
        f"crontab -l 2>/dev/null | grep -v '{CRON_MARKER}' | grep -v '^$' > /tmp/cron.tmp || true; "
        f"echo {cron_b64} | base64 -d >> /tmp/cron.tmp; "
        f"crontab /tmp/cron.tmp; rm -f /tmp/cron.tmp; crontab -l | grep sync-gateway"
    )
    print(run(c, cron_cmd))

    print("==> PM2 restart")
    print(run(c, f"cd {APP} && pm2 restart dash-next-app --update-env"))
    time.sleep(4)

    if secret:
        test = run(
            c,
            f"curl -sf -m 10 -H 'Authorization: Bearer {secret}' "
            f"http://127.0.0.1:3000/api/weer/sync-gateway",
        )
    else:
        test = run(c, "curl -sf -m 10 http://127.0.0.1:3000/api/weer/sync-gateway")
    print("==> Test sync-gateway:", test.strip())

    live = run(c, "curl -sf -m 10 http://127.0.0.1:3000/api/weer/live")
    for needle in ("lightning_storm_risk", "wh57batt", "barom_trend"):
        print(f"   live bevat {needle}:", needle in live)

    c.close()
    print("\nKlaar.")


if __name__ == "__main__":
    main()
