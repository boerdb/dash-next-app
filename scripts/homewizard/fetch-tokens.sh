#!/usr/bin/env bash
# Haal HomeWizard Local API-tokens op (handshake: knop op apparaat + POST /api/v1/token).
# Draai op een machine op hetzelfde LAN als de apparaten (bijv. 192.168.1.32).
set -euo pipefail

fetch_token() {
  local ip="$1"
  local name="$2"

  echo ""
  echo "=========================================="
  echo "  $name  ($ip)"
  echo "=========================================="
  echo "1. HomeWizard-app → Instellingen → Meters → $name → Local API → AAN"
  echo "2. Druk op de knop op het apparaat"
  echo "3. Druk hier Enter binnen 60 seconden"
  read -r

  local url resp token
  for url in "http://${ip}/api/v1/token" "https://${ip}/api/v1/token"; do
    resp="$(curl -sk -m 15 -X POST "$url" 2>/dev/null || true)"
    if [[ -n "$resp" ]] && echo "$resp" | grep -q '"token"'; then
      echo "OK via $url"
      echo "$resp"
      token="$(echo "$resp" | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
      if [[ -n "$token" ]]; then
        echo "TOKEN=$token"
        printf '%s' "$token"
        return 0
      fi
    fi
  done

  echo "Geen token ontvangen. Probeer opnieuw (Local API aan + knop)." >&2
  return 1
}

# ip:name — pas aan indien nodig
DEVICES=(
  "192.168.1.178:P1"
  "192.168.1.179:Batterij-179"
  "192.168.1.170:Batterij-170"
)

P1_TOKEN=""
BAT_TOKENS=()

for entry in "${DEVICES[@]}"; do
  ip="${entry%%:*}"
  name="${entry#*:}"
  if token="$(fetch_token "$ip" "$name")"; then
    if [[ "$name" == "P1" ]]; then
      P1_TOKEN="$token"
    else
      BAT_TOKENS+=("$token")
    fi
  fi
done

echo ""
echo "========== .env.local (plak op de Next-server) =========="
echo "ENERGIE_P1_TOKEN=${P1_TOKEN:-<p1-token>}"
if ((${#BAT_TOKENS[@]} > 0)); then
  IFS=,
  echo "ENERGIE_BATTERY_TOKENS=${BAT_TOKENS[*]}"
  unset IFS
else
  echo "ENERGIE_BATTERY_TOKENS=<token-179>,<token-170>"
fi
echo "ENERGIE_BATTERY_URLS=https://192.168.1.179,https://192.168.1.170"
echo "========================================================="
echo ""
echo "Daarna: pm2 restart dash-next-app --update-env"
echo "Test:   python scripts/db-migration/homewizard-verify-tokens.py"
