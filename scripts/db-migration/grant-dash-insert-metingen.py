#!/usr/bin/env python3
from pathlib import Path
import paramiko

from homelab import ssh_key_kwargs

SCRIPT_DIR = Path(__file__).resolve().parent
s = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

sql = (
    "GRANT INSERT ON weerdata.metingen TO 'dash_app'@'192.168.1.%'; "
    "GRANT INSERT ON weerdata.metingen TO 'dash_app'@'192.168.1.32'; "
    "FLUSH PRIVILEGES;"
)
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(s["DB_HOST"], username=s["SSH_USER"], timeout=15, **ssh_key_kwargs())
_, o, e = c.exec_command(f"mysql -u root -p{s['SSH_PASS']} -e \"{sql}\"")
print(o.read().decode() or e.read().decode() or "OK")
c.close()
