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

pw = s["SSH_PASS"]
sql = """
SELECT
  (SELECT MAX(meet_moment) FROM energie_metingen) AS last_m,
  CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+02:00') AS ams_now,
  TIMESTAMPDIFF(
    MINUTE,
    (SELECT MAX(meet_moment) FROM energie_metingen),
    CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+02:00')
  ) AS gap_mins;
SHOW GRANTS FOR 'dash_app'@'192.168.1.32';
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.14", username=s["SSH_USER"], password=pw, timeout=15)
_, o, e = c.exec_command(f'mysql -u root -p{pw} weerdata -e "{sql}"', timeout=30)
print((o.read() + e.read()).decode())

c2 = paramiko.SSHClient()
c2.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c2.connect("192.168.1.32", username=s["SSH_USER"], password=pw, timeout=15)
_, o2, e2 = c2.exec_command(
    "cd /var/www/dash-next-app && pm2 logs dash-next-app --lines 30 --nostream 2>&1 | tail -20",
    timeout=30,
)
print("pm2 logs:\n", (o2.read() + e2.read()).decode())
c.close()
c2.close()
