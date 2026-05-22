#!/usr/bin/env python3
"""Upload lokale energie/historie-wijzigingen naar 192.168.1.32 en rebuild."""
import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"
ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent

FILES = [
    "app/api/energie/ingest/route.ts",
    "app/api/energie/historie/route.ts",
    "app/(tabs)/energie/page.tsx",
    "components/energy/PowerChart.tsx",
    "lib/api/types.ts",
    "lib/db/historie-energie.ts",
    "lib/energie/historie-24h.ts",
    "package.json",
    "scripts/db-migration/FASE4.md",
    "scripts/db-migration/grant-energie-metingen-insert.py",
]

s: dict[str, str] = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()


def main() -> None:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
    sftp = c.open_sftp()

    for rel in FILES:
        local = ROOT / rel
        remote = f"{APP}/{rel.replace(chr(92), '/')}"
        remote_dir = "/".join(remote.split("/")[:-1])
        parts = remote_dir.split("/")
        for i in range(3, len(parts) + 1):
            p = "/".join(parts[:i])
            try:
                sftp.stat(p)
            except OSError:
                sftp.mkdir(p)
        print(f"upload {rel}")
        sftp.put(str(local), remote)

    sftp.close()

    def run(cmd: str, timeout: int = 600) -> str:
        _, o, e = c.exec_command(cmd, timeout=timeout)
        return (o.read() + e.read()).decode("utf-8", errors="replace")

    print(run(f"cd {APP} && npm run build", timeout=600))
    print(run(f"cd {APP} && pm2 restart dash-next-app --update-env"))
    c.close()


if __name__ == "__main__":
    main()
