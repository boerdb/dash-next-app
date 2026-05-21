#!/usr/bin/env python3
"""Verwijder lokale weerdata-database op PHP-server (.52) na migratie naar .14."""
from pathlib import Path
import sys
import urllib.request

import paramiko

SCRIPT_DIR = Path(__file__).resolve().parent


def load():
    d = {}
    for line in (SCRIPT_DIR / ".secrets.local").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip()
    return d


def ssh(host, user, pw, cmd, timeout=60):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=user, password=pw, timeout=15)
    _, o, e = c.exec_command(cmd, timeout=timeout)
    out, err = o.read().decode(), e.read().decode()
    code = o.channel.recv_exit_status()
    c.close()
    return code, out, err


def main():
    s = load()
    php = s["PHP_HOST"]
    db = s["DB_HOST"]
    user, pw = s["SSH_USER"], s["SSH_PASS"]
    db_user, db_pass = "ben", "kerkpoort"

    print("==> Controle .14")
    code, out, err = ssh(
        php,
        user,
        pw,
        f"mysql -h {db} -u {db_user} -p{db_pass} -N -e "
        f"'SELECT COUNT(*) FROM weerdata.metingen;'",
    )
    if code != 0:
        print(err or out)
        return 1
    print(f"   metingen op .14: {out.strip()}")

    print("==> Drop weerdata op .52 (localhost)")
    code, out, err = ssh(
        php,
        user,
        pw,
        f"mysql -u {db_user} -p{db_pass} -e 'DROP DATABASE IF EXISTS weerdata; SHOW DATABASES;'",
    )
    print(out or err)
    if code != 0:
        return 1
    if "weerdata" in out.lower().split():
        print("FOUT: weerdata bestaat nog op .52")
        return 1

    print("==> HTTP test historie.php")
    try:
        r = urllib.request.urlopen(f"http://{php}/historie.php?t=1", timeout=10)
        body = r.read(200).decode()
        if r.status == 200 and body.startswith("{"):
            print("   OK:", body[:80], "...")
        else:
            print("   Onverwacht:", r.status, body[:100])
            return 1
    except Exception as ex:
        print("   HTTP mislukt:", ex)
        return 1

    print("\nKlaar. Op .52 blijven: personen_db, ic_labels_db (+ systeem).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
