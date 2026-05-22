#!/usr/bin/env python3
"""Migreer personen_db en ic_labels_db van .52 naar .14."""
from __future__ import annotations

import sys
from pathlib import Path

import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent
DATABASES = ["personen_db", "ic_labels_db"]
DB_USER = "ben"
DB_PASS = "kerkpoort"
NEW_HOST = "192.168.1.14"

PHP_UPDATES = [
    ("/var/www/html/login.php", [("'localhost'", f"'{NEW_HOST}'")]),
    ("/var/www/html/register.php", [("'localhost'", f"'{NEW_HOST}'")]),
    ("/var/www/html/api_personen.php", [("'localhost'", f"'{NEW_HOST}'")]),
    ("/var/www/html/api/labels_api.php", [('$host = "localhost"', f'$host = "{NEW_HOST}"')]),
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


def ssh(host: str, user: str, pw: str, cmd: str, timeout: int = 300) -> tuple[int, str, str]:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=pw, timeout=15)
    try:
        _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode("utf-8", errors="replace")
        err = stderr.read().decode("utf-8", errors="replace")
        return stdout.channel.recv_exit_status(), out, err
    finally:
        client.close()


def sftp_get(host: str, user: str, pw: str, remote: str, local: Path) -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=pw, timeout=15)
    try:
        client.open_sftp().get(remote, str(local))
    finally:
        client.close()


def sftp_put(host: str, user: str, pw: str, local: Path, remote: str) -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=pw, timeout=15)
    try:
        client.open_sftp().put(str(local), remote)
    finally:
        client.close()


def patch_php(host: str, user: str, pw: str, path: str, replacements: list[tuple[str, str]]) -> None:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, username=user, password=pw, timeout=15)
    sftp = client.open_sftp()
    with sftp.open(path, "r") as f:
        data = f.read().decode("utf-8")
    for old, new in replacements:
        if old not in data:
            raise RuntimeError(f"{path}: '{old}' niet gevonden")
        data = data.replace(old, new, 1)
    with sftp.open(path, "w") as f:
        f.write(data.encode("utf-8"))
    sftp.close()
    client.close()


def main() -> int:
    s = load_secrets()
    php_host = s["PHP_HOST"]
    db_host = s["DB_HOST"]
    ssh_user, ssh_pw = s["SSH_USER"], s["SSH_PASS"]

    for db in DATABASES:
        print(f"\n==> {db}: tabellen op .52")
        code, out, err = ssh(
            php_host,
            ssh_user,
            ssh_pw,
            f"mysql -u {DB_USER} -p{DB_PASS} -N -e "
            f"'SELECT table_name, table_rows FROM information_schema.tables "
            f"WHERE table_schema=\"{db}\" ORDER BY table_name;'",
        )
        print(out or err)
        if code != 0:
            return 1

    for db in DATABASES:
        dump_remote = f"/tmp/{db}_migrate.sql"
        local_dump = SCRIPT_DIR / f"{db}_migrate.sql"
        remote_on_db = f"/tmp/{db}_migrate.sql"

        print(f"\n==> Dump {db}")
        code, out, err = ssh(
            php_host,
            ssh_user,
            ssh_pw,
            f"mysqldump -u {DB_USER} -p{DB_PASS} --single-transaction --routines --triggers {db} > {dump_remote} "
            f"&& wc -c {dump_remote}",
            timeout=600,
        )
        print(out or err)
        if code != 0:
            return 1

        sftp_get(php_host, ssh_user, ssh_pw, dump_remote, local_dump)
        print(f"   lokaal: {local_dump} ({local_dump.stat().st_size} bytes)")
        sftp_put(db_host, ssh_user, ssh_pw, local_dump, remote_on_db)

        print(f"==> Import {db} op .14")
        setup = (
            f"CREATE DATABASE IF NOT EXISTS {db} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; "
            f"GRANT ALL PRIVILEGES ON {db}.* TO '{DB_USER}'@'{php_host}'; "
            f"FLUSH PRIVILEGES;"
        )
        code, out, err = ssh(
            db_host,
            ssh_user,
            ssh_pw,
            f"mysql -u root -p{ssh_pw} -e '{setup}'",
        )
        if code != 0:
            print(err or out)
            return 1

        code, out, err = ssh(
            db_host,
            ssh_user,
            ssh_pw,
            f"mysql -u root -p{ssh_pw} {db} < {remote_on_db}",
            timeout=600,
        )
        if code != 0:
            print("Import mislukt:", err or out)
            return 1

        code, out, err = ssh(
            php_host,
            ssh_user,
            ssh_pw,
            f"mysql -h {NEW_HOST} -u {DB_USER} -p{DB_PASS} -N -e "
            f"'SELECT table_name FROM information_schema.tables WHERE table_schema=\"{db}\";'",
        )
        print(f"   tabellen op .14 (via .52):", (out or err).strip())
        if code != 0:
            return 1

        local_dump.unlink(missing_ok=True)
        ssh(php_host, ssh_user, ssh_pw, f"rm -f {dump_remote}")
        ssh(db_host, ssh_user, ssh_pw, f"rm -f {remote_on_db}")

    print("\n==> PHP config -> 192.168.1.14")
    for path, reps in PHP_UPDATES:
        patch_php(php_host, ssh_user, ssh_pw, path, reps)
        code, out, err = ssh(php_host, ssh_user, ssh_pw, f"grep -n host {path} | head -3")
        print(path, out.strip() or err)

    print("\n==> Verificatie connecties")
    for db in DATABASES:
        code, out, err = ssh(
            php_host,
            ssh_user,
            ssh_pw,
            f"mysql -h {NEW_HOST} -u {DB_USER} -p{DB_PASS} -e 'USE {db}; SHOW TABLES;'",
        )
        print(f"--- {db} ---\n{out or err}")
        if code != 0:
            return 1

    print("\n==> Verwijder lokale kopieën op .52")
    for db in DATABASES:
        code, out, err = ssh(
            php_host,
            ssh_user,
            ssh_pw,
            f"mysql -u {DB_USER} -p{DB_PASS} -e 'DROP DATABASE IF EXISTS {db};'",
        )
        print(f"DROP {db}:", out or err or "OK")

    code, out, err = ssh(php_host, ssh_user, ssh_pw, "mysql -u ben -pkerkpoort -N -e 'SHOW DATABASES;'")
    print("Databases over op .52:\n", out or err)

    print("\nKlaar.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
