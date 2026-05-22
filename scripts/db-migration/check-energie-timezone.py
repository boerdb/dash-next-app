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

sql = """
SELECT @@global.time_zone AS global_tz, @@session.time_zone AS session_tz, NOW() AS db_now,
  CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'Europe/Amsterdam') AS ams_from_utc,
  UTC_TIMESTAMP() AS utc_now;
SHOW CREATE TABLE energie_metingen\\G
SELECT meet_moment, actueel_vermogen_w FROM energie_metingen ORDER BY meet_moment DESC LIMIT 6;
SELECT DATE_FORMAT(meet_moment, '%H:00') AS uur, ROUND(AVG(actueel_vermogen_w)) AS w
FROM energie_metingen WHERE meet_moment >= NOW() - INTERVAL 24 HOUR
GROUP BY DATE(meet_moment), HOUR(meet_moment) ORDER BY MIN(meet_moment);
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("192.168.1.14", username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
_, o, e = c.exec_command(f"mysql -u root -p{s['SSH_PASS']} weerdata -e \"{sql}\" 2>&1", timeout=30)
print((o.read() + e.read()).decode())
c.close()
