#!/usr/bin/env python3
from pathlib import Path
import paramiko
import sys

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

def run(cmd: str, wait: int = 60) -> str:
    _, o, e = c.exec_command(cmd, timeout=wait)
    return (o.read() + e.read()).decode("utf-8", errors="replace")

def safe_print(text: str) -> None:
    sys.stdout.buffer.write(text.encode("utf-8", errors="replace"))
    sys.stdout.buffer.write(b"\n")

safe_print("=== cloudflared config ===")
safe_print(run("cat /etc/cloudflared/config.yml 2>/dev/null; cat /root/.cloudflared/config.yml 2>/dev/null; echo ---"))
safe_print("=== cloudflared service ===")
safe_print(run("systemctl status cloudflared 2>/dev/null | head -10; echo ---"))
safe_print("=== env vars ===")
safe_print(run("env | grep -i cloud 2>/dev/null; echo ---"))
safe_print("=== cloudflared tunnel list ===")
safe_print(run("cloudflared tunnel list 2>/dev/null; echo ---"))
c.close()
