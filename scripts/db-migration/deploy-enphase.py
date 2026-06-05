#!/usr/bin/env python3
"""Upload Enphase-integratie naar .32, zet env-vars en herstart pm2."""
import sys
import time
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"
ENV_FILE = f"{APP}/.env.local"
ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
TOKEN_FILE = SCRIPT_DIR / ".enphase-token.txt"
DEFAULT_SERIAL = "122310038998"
DEFAULT_GATEWAY = "https://192.168.1.163"

FILES = [
    "lib/enphase/types.ts",
    "lib/enphase/http.ts",
    "lib/enphase/map.ts",
    "lib/enphase/map.test.ts",
    "lib/enphase/auth.ts",
    "lib/enphase/fetch.ts",
    "lib/api/types.ts",
    "lib/api/energie-map.ts",
    "lib/db/energie-store.ts",
    "lib/energie/dagstart.ts",
    "lib/env.server.ts",
    "components/energy/DailyStats.tsx",
    ".env.example",
    "package.json",
]


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
    for key, val in updates.items():
        out.append(f"{key}={val}")
    with sftp.open(ENV_FILE, "w") as f:
        f.write("\n".join(out) + "\n")


def main() -> None:
    if not TOKEN_FILE.is_file():
        print(f"Geen {TOKEN_FILE.name} — eerst token ophalen.")
        sys.exit(1)

    token = TOKEN_FILE.read_text(encoding="utf-8").strip()
    s = load_secrets()
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

    patch_env_local(
        sftp,
        {
            "ENPHASE_GATEWAY_URL": DEFAULT_GATEWAY,
            "ENPHASE_GATEWAY_SERIAL": DEFAULT_SERIAL,
            "ENPHASE_GATEWAY_TOKEN": token,
        },
    )
    sftp.close()

    def run(cmd: str, timeout: int = 600) -> str:
        _, o, e = c.exec_command(cmd, timeout=timeout)
        return (o.read() + e.read()).decode("utf-8", errors="replace")

    print(run(f"cd {APP} && npm run build", timeout=600))
    print(run(f"cd {APP} && pm2 restart dash-next-app --update-env"))
    time.sleep(4)
    print(
        run(
            "curl -s -m 15 http://127.0.0.1:3000/api/energie/live | "
            "python3 -c \"import sys,json; d=json.load(sys.stdin); "
            "print(json.dumps(d.get('enphase'), indent=2))\""
        )
    )
    c.close()
    print("Deploy klaar.")


if __name__ == "__main__":
    main()
