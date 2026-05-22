#!/usr/bin/env python3
import sys
from pathlib import Path
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
s = {}
for line in (Path(__file__).parent / ".secrets.local").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        s[k.strip()] = v.strip()

sql = """
SELECT updated_at,
  JSON_UNQUOTE(JSON_EXTRACT(payload,'$.temp_c')) AS temp_c,
  JSON_UNQUOTE(JSON_EXTRACT(payload,'$.temp2f')) AS temp2f_raw,
  JSON_UNQUOTE(JSON_EXTRACT(payload,'$.tempf')) AS tempf_raw,
  JSON_UNQUOTE(JSON_EXTRACT(payload,'$.server_timestamp')) AS ts,
  JSON_UNQUOTE(JSON_EXTRACT(payload,'$.dateutc')) AS dateutc,
  JSON_UNQUOTE(JSON_EXTRACT(payload,'$.windspd_avg10m_kmh')) AS wind,
  TIMESTAMPDIFF(SECOND, updated_at, NOW()) AS sec_since_update
FROM weer_live WHERE id=1;
"""

for host, cmd in [
    ("14", f"mysql -u root -p{s['SSH_PASS']} weerdata -e \"{sql}\""),
    ("32", "tail -n 30 /root/.pm2/logs/dash-next-app-out.log 2>/dev/null; echo '---'; date"),
]:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(
        "192.168.1.32" if host == "32" else "192.168.1.14",
        username=s["SSH_USER"],
        password=s["SSH_PASS"],
        timeout=15,
    )
    _, o, e = c.exec_command(cmd)
    print(f"=== {host} ===")
    print((o.read() + e.read()).decode("utf-8", errors="replace"))
    c.close()
