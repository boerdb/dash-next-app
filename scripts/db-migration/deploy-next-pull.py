#!/usr/bin/env python3
from pathlib import Path
import paramiko
import sys
import time

SCRIPT_DIR = Path(__file__).resolve().parent
HOST = "192.168.1.32"
APP = "/var/www/dash-next-app"

s = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)


def run(cmd: str, wait: int = 300) -> tuple[str, int]:
    _, o, e = c.exec_command(cmd, timeout=wait)
    out = (o.read() + e.read()).decode("utf-8", errors="replace")
    code = o.channel.recv_exit_status()
    return out, code


def safe_print(text: str) -> None:
    sys.stdout.buffer.write(text.encode("utf-8", errors="replace"))
    sys.stdout.buffer.write(b"\n")


def must(cmd: str, wait: int = 300) -> str:
    out, code = run(cmd, wait=wait)
    safe_print(out)
    if code != 0:
        raise SystemExit(f"FAILED ({code}): {cmd}")
    return out


# Serwist herschrijft public/sw.js bij elke build; dat blokkeert git pull.
# Daarom hard syncen naar origin/main i.p.v. een vies working tree te mergen.
must(f"cd {APP} && git fetch origin")
must(f"cd {APP} && git reset --hard origin/main")
must(f"cd {APP} && git clean -fd")

head, _ = run(f"cd {APP} && git rev-parse --short HEAD && git log -1 --oneline")
safe_print("=== deployed HEAD ===\n" + head)

must(f"cd {APP} && rm -rf .next")
must(f"cd {APP} && npm run build", wait=600)
must(f"cd {APP} && pm2 restart dash-next-app --update-env")
time.sleep(4)
live, _ = run("curl -s -m 8 http://127.0.0.1:3000/api/weer/live")
safe_print("live: " + live[:400])
c.close()
