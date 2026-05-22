# Fase 4 — Energie live zonder energie.php

## Flow

1. Next haalt **P1** op: `ENERGIE_P1_URL` (default `http://192.168.1.178/api/v1/data`)
2. Next haalt **water** op: `ENERGIE_WATER_URL` (default `http://192.168.1.169/api/v1/data`)
3. Dagstart (middernacht-totalen) in `energie_dagstart` op MariaDB `.14` (was `dagstart.json`)
4. Elke 5 min: rij in `energie_metingen` (was `save_energy.php` cron)

## Setup

```bash
python scripts/db-migration/setup-energie-dagstart.py
```

Optioneel in `.env`:

```env
ENERGIE_P1_URL=http://192.168.1.178/api/v1/data
ENERGIE_WATER_URL=http://192.168.1.169/api/v1/data
```

## Opruimen op .52

- Cron `save_energy.php` uitzetten
- `energie.php` niet meer nodig voor het dashboard

Historie energie ging al via fase 1 (`/api/energie/historie` → DB).
