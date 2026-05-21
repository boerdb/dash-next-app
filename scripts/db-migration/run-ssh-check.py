#!/usr/bin/env python3
import paramiko
from pathlib import Path

def load():
    d = {}
    for line in Path(__file__).parent.joinpath(".secrets.local").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip()
    return d

def run(host, cmd):
    s = load()
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(host, username=s["SSH_USER"], password=s["SSH_PASS"], timeout=15)
    _, o, e = c.exec_command(cmd, timeout=120)
    out = o.read().decode()
    err = e.read().decode()
    code = o.channel.recv_exit_status()
    c.close()
    return code, out, err

if __name__ == "__main__":
    import sys
    host = sys.argv[1]
    cmd = sys.argv[2]
    code, out, err = run(host, cmd)
    print(out)
    if err:
        print("STDERR:", err, file=sys.stderr)
    sys.exit(code)
