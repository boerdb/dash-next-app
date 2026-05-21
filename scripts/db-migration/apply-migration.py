#!/usr/bin/env python3
"""Dump weerdata van .52, import op .14, PHP host aanpassen, verifiëren."""
from __future__ import annotations

import re
import sys
from pathlib import Path

import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent
DB_NAME = "weerdata"
DB_USER = "ben"
DB_PASS = "kerkpoort"
NEW_HOST = "192.168.1.14"

PHP_FILES_VARS = [
    "/var/www/html/save_weather.php",
    "/var/www/html/save_energy.php",
    "/var/www/html/getijden_beheer.php",
]

PHP_FILES_INLINE = [
    "/var/www/html/historie.php",
    "/var/www/html/historie_energie.php",
]


def load_secrets() -> dict[str, str]:
    data: dict[str, str] = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        data[k.strip()] = v.strip()
    return data


def ssh(host: str, user: str, password: str, cmd: str, timeout: int = 300) -> tuple[int, str, str]:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=password, timeout=15)
    try:
        _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        return stdout.channel.recv_exit_status(), out, err
    finally:
        client.close()


def scp_put(local_path: str, remote_host: str, remote_path: str, user: str, password: str) -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(remote_host, username=user, password=password, timeout=15)
    try:
        sftp = client.open_sftp()
        sftp.put(local_path, remote_path)
        sftp.close()
    finally:
        client.close()


def main() -> int:
    s = load_secrets()
    php_host = s["PHP_HOST"]
    db_host = s["DB_HOST"]
    user = s["SSH_USER"]
    pw = s["SSH_PASS"]
    php_ip = php_host

    print("==> Row counts bron (.52 localhost)")
    code, out, err = ssh(
        php_host,
        user,
        pw,
        f"mysql -u {DB_USER} -p{DB_PASS} -N -e "
        f"'SELECT table_name, table_rows FROM information_schema.tables "
        f"WHERE table_schema=\"{DB_NAME}\" ORDER BY table_name;'",
    )
    print(out or err)
    if code != 0:
        return 1

    dump_remote = "/tmp/weerdata_migrate.sql"
    print("==> mysqldump op .52")
    code, out, err = ssh(
        php_host,
        user,
        pw,
        f"mysqldump -u {DB_USER} -p{DB_PASS} --single-transaction --routines --triggers {DB_NAME} > {dump_remote} "
        f"&& wc -l {dump_remote} && grep -c 'CREATE TABLE' {dump_remote}",
        timeout=600,
    )
    print(out or err)
    if code != 0:
        return 1

    print("==> Download dump naar lokaal")
    local_dump = SCRIPT_DIR / "weerdata_migrate.sql"
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(php_host, username=user, password=pw, timeout=15)
    sftp = client.open_sftp()
    sftp.get(dump_remote, str(local_dump))
    sftp.close()
    client.close()
    print(f"   {local_dump} ({local_dump.stat().st_size} bytes)")

    remote_on_db = "/tmp/weerdata_migrate.sql"
    print("==> Upload dump naar .14")
    scp_put(str(local_dump), db_host, remote_on_db, user, pw)

    print("==> Database + user op .14")
    sql_setup = f"""
CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '{DB_USER}'@'{php_ip}' IDENTIFIED BY '{DB_PASS}';
GRANT ALL PRIVILEGES ON `{DB_NAME}`.* TO '{DB_USER}'@'{php_ip}';
FLUSH PRIVILEGES;
"""
    sql_escaped = sql_setup.replace("'", "'\\''")
    code, out, err = ssh(db_host, user, pw, f"mysql -u root -p{pw} -e '{sql_escaped}'")
    print(out or err)
    if code != 0:
        print("Setup mislukt:", err)
        return 1

    print("==> Import op .14")
    code, out, err = ssh(
        db_host,
        user,
        pw,
        f"mysql -u root -p{pw} {DB_NAME} < {remote_on_db}",
        timeout=600,
    )
    if code != 0:
        print("Import mislukt:", err or out)
        return 1
    print("Import OK")

    print("==> Row counts doel (.14)")
    code, out, err = ssh(
        db_host,
        user,
        pw,
        f"mysql -u root -p{pw} -N -e "
        f"'SELECT table_name, table_rows FROM information_schema.tables "
        f"WHERE table_schema=\"{DB_NAME}\" ORDER BY table_name;'",
    )
    print(out or err)

    print("==> PHP db_host -> 192.168.1.14")
    for path in PHP_FILES_VARS:
        code, out, err = ssh(
            php_host,
            user,
            pw,
            f"sed -i \"s/\\$db_host = 'localhost'/\\$db_host = '{NEW_HOST}'/\" {path} "
            f"&& grep db_host {path} | head -1",
        )
        print(path, out.strip() or err)

    for path in PHP_FILES_INLINE:
        code, out, err = ssh(
            php_host,
            user,
            pw,
            f"sed -i \"s/new mysqli('localhost'/new mysqli('{NEW_HOST}'/g; "
            f"sed -i 's/new mysqli(\"localhost\"/new mysqli(\"{NEW_HOST}\"/g' {path} "
            f"&& grep mysqli {path} | head -1",
        )
        print(path, out.strip() or err)

    print("==> Test DB vanaf .52 naar .14")
    code, out, err = ssh(
        php_host,
        user,
        pw,
        f"mysql -h {NEW_HOST} -u {DB_USER} -p{DB_PASS} -e 'SELECT COUNT(*) AS metingen FROM {DB_NAME}.metingen;'",
    )
    print(out or err)
    if code != 0:
        return 1

    print("==> HTTP test historie.php")
    code, out, err = ssh(php_host, user, pw, f"curl -s 'http://127.0.0.1/historie.php?t=1' | head -c 200")
    print(out[:200] if out else err)

    local_dump.unlink(missing_ok=True)
    print("\nMigratie afgerond. Pas Next WEER_API_BASE=http://192.168.1.52 aan.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
