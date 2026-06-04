#!/usr/bin/env bash
# Haal HomeWizard Local API-tokens op (handshake: knop op apparaat + POST /api/v1/token).
# Draai op een machine op hetzelfde LAN als de apparaten (bijv. 192.168.1.32).
set -euo pipefail

fetch_token() {
  local ip="$1"
  local name="$2"
  local url="https://${ip}/api/user"
  local body='{"name":"local/dash-next-app"}'

  echo ""
  echo "=========================================="
  echo "  $name  ($ip)"
  echo "=========================================="
  echo "1. HomeWizard-app → Local API → AAN"
  echo "2. Druk kort op de knop (script pollt 120s)"
  echo ""

  local i resp token
  for i in $(seq 1 60); do
    resp="$(curl -sk -m 10 -X POST "$url" \
      -H "Content-Type: application/json" \
      -H "X-Api-Version: 2" \
      -d "$body" 2>/dev/null || true)"
    token="$(echo "$resp" | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
    if [[ -n "$token" ]]; then
      echo "OK na ${i} pogingen"
      printf '%s' "$token"
      return 0
    fi
    if [[ $((i % 5)) -eq 1 ]]; then
      echo "  … wacht op knop ($i/60)"
    fi
    sleep 2
  done

  echo "Geen token (gebruik POST https://${ip}/api/user, geen v1/token)." >&2
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
