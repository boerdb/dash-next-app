#!/usr/bin/env python3
from pathlib import Path
import paramiko

s = {}
for line in Path(__file__).parent.joinpath(".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

host, user, pw = s["PHP_HOST"], s["SSH_USER"], s["SSH_PASS"]
NEW = "192.168.1.14"

files = {
    "/var/www/html/historie.php": ("'localhost'", f"'{NEW}'"),
    "/var/www/html/historie_energie.php": ('"localhost"', f'"{NEW}"'),
}

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pw, timeout=15)
sftp = c.open_sftp()

for path, (old, new) in files.items():
    with sftp.open(path, "r") as f:
        data = f.read().decode("utf-8")
    if old not in data:
        print(f"SKIP {path}: {old} not found")
        continue
    data = data.replace(old, new, 1)
    with sftp.open(path, "w") as f:
        f.write(data.encode("utf-8"))
    print(f"OK {path}")

sftp.close()
c.close()
