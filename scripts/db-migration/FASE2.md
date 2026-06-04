# Fase 2 — Live weer zonder api.php

## Flow

1. Ecowitt post naar `http://192.168.1.32:3000/api/weer/ingest`
2. Bereken dauwpunt + gevoelstemperatuur in TypeScript (`lib/weer/enrich-live.ts`)
3. Sla snapshot op in `weerdata.weer_live` (cache bij DB-storing)
4. Fallback: cache of laatste rij in `metingen`

## Setup (eenmalig)

```bash
python scripts/db-migration/setup-weer-live-table.py
```

## Nog niet in fase 2

- `upload.php` / cron `save_weather.php` (fase 3)
- Getijden in live JSON (`tide_info`) — app gebruikt `/api/weer/getijden`

## Nog via PHP

- `/api/energie/live` → `energie.php`
