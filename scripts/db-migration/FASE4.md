# Fase 4 — Energie live zonder energie.php

## Flow

1. Next haalt **P1** op: `ENERGIE_P1_URL` (default `http://192.168.1.178/api/v1/data`)
2. Next haalt **water** op: `ENERGIE_WATER_URL` (default `http://192.168.1.169/api/v1/data`)
3. Next haalt **batterijen** op via API v2 (`/api/measurement`, HTTPS + Bearer). Zie `ENERGIE_BATTERY_TOKENS` in `.env.example`
4. Dagstart (middernacht-totalen) in `energie_dagstart` op MariaDB `.14` (was `dagstart.json`)
5. Elke 5 min: rij in `energie_metingen` (was `save_energy.php` cron)

## Setup

```bash
python scripts/db-migration/setup-energie-dagstart.py
```

## HomeWizard-tokens (Local API)

Plug-In batterijen en P1 v2 (`/api/batteries`, `/api/measurement`) vereisen een **Bearer-token**. P1 live data (`/api/v1/data`) werkt zonder token.

Per apparaat (P1 + elke batterij):

1. HomeWizard-app → **Instellingen → Meters → [apparaat] → Local API → Aan**
2. **Knop** op het apparaat indrukken (60 s geldig)
3. Token ophalen: `POST https://<IP>/api/user` met `X-Api-Version: 2` en body `{"name":"local/dash-next-app"}` — **niet** `/api/v1/token` (bestaat niet op nieuwere firmware)

Scripts (vanaf je pc, via SSH op `.32`):

```bash
# Interactief: knop → Enter → tokens in .env.local + pm2 restart
python scripts/db-migration/homewizard-fetch-tokens.py

# Alleen op de server (bash):
bash scripts/homewizard/fetch-tokens.sh

# Controleren:
python scripts/db-migration/homewizard-verify-tokens.py
```

`.env.local` op `192.168.1.32`:

```env
ENERGIE_P1_URL=http://192.168.1.178/api/v1/data
ENERGIE_WATER_URL=http://192.168.1.169/api/v1/data
ENERGIE_BATTERY_URLS=https://192.168.1.179,https://192.168.1.170
ENERGIE_BATTERY_TOKENS=<token-179>,<token-170>
ENERGIE_P1_TOKEN=<token-p1>
```

## Historie / cron (belangrijk)

Metingen komen alleen in `energie_metingen` als `/api/energie/live` of **`/api/energie/ingest`** draait (max. 1× per 5 min). Zonder periodieke ingest loopt de 24u-grafiek achter als het dashboard dicht is.

Op de host waar Next draait (elke 5 min):

```bash
# Optioneel in .env: CRON_SECRET=...
*/5 * * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/energie/ingest
```

Zonder `CRON_SECRET` is de route open — alleen op localhost gebruiken of secret zetten.

## Opruimen op .52

- Cron `save_energy.php` uitzetten (vervangen door ingest hierboven)
- `energie.php` niet meer nodig voor het dashboard

Historie energie via `/api/energie/historie` → DB (24 uur, Europe/Amsterdam).
