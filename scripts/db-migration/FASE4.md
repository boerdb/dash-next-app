# Fase 4 — Energie live zonder energie.php

## Flow

1. Next haalt **P1** op: `ENERGIE_P1_URL` (default `http://192.168.1.178/api/v1/data`)
2. Next haalt **water** op: `ENERGIE_WATER_URL` (default `http://192.168.1.169/api/v1/data`)
3. Next haalt **batterijen** op: `ENERGIE_BATTERY_URLS` (default `.179` + `.170`, komma-gescheiden)
4. Dagstart (middernacht-totalen) in `energie_dagstart` op MariaDB `.14` (was `dagstart.json`)
5. Elke 5 min: rij in `energie_metingen` (was `save_energy.php` cron)

## Setup

```bash
python scripts/db-migration/setup-energie-dagstart.py
```

Optioneel in `.env`:

```env
ENERGIE_P1_URL=http://192.168.1.178/api/v1/data
ENERGIE_WATER_URL=http://192.168.1.169/api/v1/data
ENERGIE_BATTERY_URLS=http://192.168.1.179/api/v1/data,http://192.168.1.170/api/v1/data
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
