#!/usr/bin/env python3
"""Backfill weer_regen_dag uit metingen (MAX regen_mm per dag, Amsterdam-tijd)."""
import sys
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).resolve().parent
JAAR = 2026


def main() -> None:
    s = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            s[k.strip()] = v.strip()

    sql = f"""
INSERT INTO weer_regen_dag (dag, regen_mm)
SELECT dag, regen_mm FROM (
  SELECT
    DATE(CONVERT_TZ(meet_moment, '+00:00', '+02:00')) AS dag,
    ROUND(MAX(regen_mm), 1) AS regen_mm
  FROM metingen
  WHERE YEAR(CONVERT_TZ(meet_moment, '+00:00', '+02:00')) = {JAAR}
  GROUP BY DATE(CONVERT_TZ(meet_moment, '+00:00', '+02:00'))
) AS src
ON DUPLICATE KEY UPDATE regen_mm = GREATEST(weer_regen_dag.regen_mm, src.regen_mm);
SELECT COUNT(*) AS dagen FROM weer_regen_dag WHERE YEAR(dag) = {JAAR};
SELECT MONTH(dag) AS maand, ROUND(SUM(regen_mm),1) AS mm
FROM weer_regen_dag WHERE YEAR(dag) = {JAAR}
GROUP BY MONTH(dag) ORDER BY maand;
"""

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(s["DB_HOST"], username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
    _, o, e = c.exec_command(
        f"mysql -u root -p{s['SSH_PASS']} weerdata -e \"{sql}\"",
        timeout=120,
    )
    print((o.read() + e.read()).decode("utf-8", errors="replace"))
    c.close()
    print("Backfill klaar.")


if __name__ == "__main__":
    main()
