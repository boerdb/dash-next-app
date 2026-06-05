#!/usr/bin/env python3
"""
Enphase IQ Gateway JWT ophalen via Enlighten (lokaal API, firmware D7+).

1. Log in op enlighten.enphaseenergy.com (MFA moet UIT staan).
2. Dit script vraagt e-mail/wachtwoord en serial (bijv. 122310038998).
3. Schrijft ENPHASE_GATEWAY_TOKEN naar .env.local op .32 (optioneel).

Token is ~1 jaar geldig. Gateway: https://192.168.1.163
"""
import json
import sys
from getpass import getpass
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

LOGIN_URL = "https://enlighten.enphaseenergy.com/login/login.json"
TOKEN_URL = "https://enlighten.enphaseenergy.com/entrez-auth-token"
DEFAULT_SERIAL = "122310038998"
DEFAULT_GATEWAY = "https://192.168.1.163"


def login(email: str, password: str) -> str | None:
    body = urlencode({"user[email]": email, "user[password]": password}).encode()
    req = Request(
        LOGIN_URL,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urlopen(req, timeout=15) as res:
        data = json.loads(res.read().decode())
    return data.get("session_id")


def fetch_token(session_id: str, serial: str) -> str | None:
    url = f"{TOKEN_URL}?serial_num={serial}"
    req = Request(url, headers={"cookie": f"_enlighten_4_session={session_id}"})
    with urlopen(req, timeout=15) as res:
        data = json.loads(res.read().decode())
    return data.get("token")


def main() -> int:
    print("Enphase Enlighten login (MFA moet uit staan)")
    email = input("E-mail: ").strip()
    password = getpass("Wachtwoord: ")
    serial = input(f"Gateway serial [{DEFAULT_SERIAL}]: ").strip() or DEFAULT_SERIAL

    session_id = login(email, password)
    if not session_id:
        print("Login mislukt — controleer gegevens en MFA.", file=sys.stderr)
        return 1

    token = fetch_token(session_id, serial)
    if not token:
        print("Token ophalen mislukt — serial of sessie ongeldig.", file=sys.stderr)
        return 1

    print("\nToken (1 jaar geldig):\n")
    print(token)
    print("\nVoeg toe aan .env.local op de Next-server (.32):")
    print(f"ENPHASE_GATEWAY_URL={DEFAULT_GATEWAY}")
    print(f"ENPHASE_GATEWAY_SERIAL={serial}")
    print(f"ENPHASE_GATEWAY_TOKEN={token}")

    out = Path(__file__).resolve().parent / ".enphase-token.txt"
    out.write_text(token, encoding="utf-8")
    print(f"\nOok opgeslagen in {out.name} (niet committen).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
