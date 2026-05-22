#!/usr/bin/env python3
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
s = {}
for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

sql = r"""
SELECT meet_moment, temp_c FROM metingen
WHERE DATE(meet_moment) = CURDATE()
ORDER BY meet_moment DESC LIMIT 8;
SELECT updated_at,
  JSON_UNQUOTE(JSON_EXTRACT(payload,'$.temp_c')) AS temp_c,
  JSON_UNQUOTE(JSON_EXTRACT(payload,'$.server_timestamp')) AS ts
FROM weer_live WHERE id=1;
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.14", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
cmd = f"mysql -u root -p{s['SSH_PASS']} weerdata -e \"{sql}\""
_, o, e = c.exec_command(cmd)
print((o.read() + e.read()).decode("utf-8", errors="replace"))
c.close()
