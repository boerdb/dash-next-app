#!/usr/bin/env python3
"""SSH + MySQL migratie-hulp. Credentials via .secrets.local (gitignored)."""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

try:
    import paramiko
    import pymysql
except ImportError:
    print("Installeer: pip install paramiko pymysql", file=sys.stderr)
    sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent


def load_secrets() -> dict[str, str]:
    secrets_path = SCRIPT_DIR / ".secrets.local"
    if not secrets_path.exists():
        print(f"Ontbreekt: {secrets_path}", file=sys.stderr)
        sys.exit(1)
    data: dict[str, str] = {}
    for line in secrets_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        data[k.strip()] = v.strip()
    return data


def ssh_run(host: str, user: str, password: str, cmd: str, timeout: int = 60) -> tuple[int, str, str]:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, timeout=15)
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        code = stdout.channel.recv_exit_status()
        return code, out, err
    finally:
        client.close()


def mysql_query(host: str, password: str, sql: str, database: str | None = None) -> list:
    conn = pymysql.connect(
        host=host,
        user="root",
        password=password,
        database=database,
        charset="utf8mb4",
        connect_timeout=10,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            if cur.description:
                return cur.fetchall()
            conn.commit()
            return []
    finally:
        conn.close()


def find_php_db_config(php_host: str, ssh_user: str, ssh_pass: str) -> dict[str, str]:
    cmd = r"""grep -rniE "DB_HOST|DB_NAME|DB_USER|DB_PASS|mysqli_connect|new PDO" /var/www /home 2>/dev/null \
      --include='*.php' --include='.env' --include='.env.*' --include='config.php' | head -40"""
    code, out, err = ssh_run(php_host, ssh_user, ssh_pass, cmd)
    print("=== PHP config grep ===")
    print(out or err or "(geen output)")
    info: dict[str, str] = {}
    for line in (out or "").splitlines():
        m = re.search(r"DB_HOST['\"]?\s*[=,>]\s*['\"]?([^'\";\s]+)", line, re.I)
        if m:
            info["DB_HOST"] = m.group(1)
        m = re.search(r"DB_NAME['\"]?\s*[=,>]\s*['\"]?([^'\";\s]+)", line, re.I)
        if m:
            info["DB_NAME"] = m.group(1)
        m = re.search(r"DB_USER['\"]?\s*[=,>]\s*['\"]?([^'\";\s]+)", line, re.I)
        if m:
            info["DB_USER"] = m.group(1)
    # Zoek .env bestanden
    code2, out2, _ = ssh_run(
        php_host,
        ssh_user,
        ssh_pass,
        r"find /var/www /home -maxdepth 5 \( -name '.env' -o -name '.env.*' -o -name 'config.php' \) 2>/dev/null | head -20",
    )
    print("\n=== Config bestanden ===")
    print(out2 or "(geen)")
    for path in (out2 or "").strip().splitlines():
        if not path.strip():
            continue
        code3, content, _ = ssh_run(php_host, ssh_user, ssh_pass, f"grep -E 'DB_|HOST|database' '{path.strip()}' 2>/dev/null | head -15")
        if content.strip():
            print(f"\n--- {path.strip()} ---")
            print(content)
            for key in ("DB_HOST", "DB_NAME", "DB_USER", "DB_DATABASE", "MYSQL_HOST"):
                m = re.search(rf"{key}\s*=\s*['\"]?([^'\"#\s]+)", content, re.I)
                if m:
                    info[key.replace("DB_DATABASE", "DB_NAME").replace("MYSQL_HOST", "DB_HOST")] = m.group(1)
    return info


def main() -> int:
    s = load_secrets()
    php_host = s["PHP_HOST"]
    db_host = s["DB_HOST"]
    ssh_user = s["SSH_USER"]
    ssh_pass = s["SSH_PASS"]
    mysql_pass = s["MYSQL_ROOT_PASS"]

    print(f"SSH test {php_host}...")
    code, out, err = ssh_run(php_host, ssh_user, ssh_pass, "hostname && ls -la /var/www 2>/dev/null | head -15")
    if code != 0:
        print("SSH PHP mislukt:", err or out)
        return 1
    print(out)

    php_cfg = find_php_db_config(php_host, ssh_user, ssh_pass)
    print("\n=== Afgeleide PHP DB settings ===")
    print(php_cfg)

    print(f"\nMySQL op {db_host}...")
    dbs = mysql_query(db_host, mysql_pass, "SHOW DATABASES")
    print("Databases:", [r[0] for r in dbs])

    db_name = php_cfg.get("DB_NAME", "weer")
    try:
        tables = mysql_query(db_host, mysql_pass, "SHOW TABLES", database=db_name)
        print(f"Tabellen in `{db_name}` op {db_host}:", [r[0] for r in tables])
    except pymysql.Error as e:
        print(f"Database `{db_name}` op {db_host}: {e}")

    # Test of PHP al naar db_host wijst
    current_host = php_cfg.get("DB_HOST", "")
    if current_host in (db_host, "192.168.1.14"):
        print(f"\nOK: PHP DB_HOST is al {current_host}")
    else:
        print(f"\nACTIE NODIG: PHP DB_HOST is '{current_host}', moet {db_host} worden")

    return 0


if __name__ == "__main__":
    sys.exit(main())
