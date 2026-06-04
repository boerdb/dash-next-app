# Interne infrastructuur (thuisnetwerk)

| Host | Rol | Services |
|------|-----|----------|
| **192.168.1.32** | Next.js | `/var/www/dash-next-app`, PM2 `dash-next-app`, poort 3000 |
| **192.168.1.14** | Data | **MariaDB** (`weerdata`), **Redis** (optioneel, app gebruikt het nog niet) |

**Publiek:** Cloudflare Tunnel → [https://dash.clvs.nl](https://dash.clvs.nl)

## MariaDB (.14)

- Database weer/energie: `weerdata` (o.a. `weer_live`, `metingen`, `energie_metingen`, `energie_dagstart`)
- Next-app (`.32`) via user `dash_app`

## Next.js dashboard (`.32`)

**Ecowitt** (LAN, niet via de tunnel):

`http://192.168.1.32:3000/api/weer/ingest`

**Energie-ingest** (cron elke 5 min, lokaal op `.32`):

`curl -sf -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/energie/ingest`

Na deploy: op dash.clvs.nl sitegegevens wissen of PWA opnieuw installeren (oude service worker cachet anders API’s).

Met `DATABASE_URL` naar `.14`:

| Endpoint | Bron |
|----------|------|
| `/api/weer/ingest` | Ecowitt → `weer_live` + `metingen` |
| `/api/weer/live` | `weer_live` |
| `/api/weer/historie` | `metingen` |
| `/api/energie/live` | P1 `.178` + water `.169` + batterijen `.179`/`.170` |
| `/api/energie/historie` | `energie_metingen` + dagstart JSON |
| `/api/energie/ingest` | Zelfde bronnen → periodieke metingen |
| `/api/weer/getijden` | RWS / Open-Meteo |

## HomeWizard (LAN)

| Apparaat | IP |
|----------|-----|
| P1 | 192.168.1.178 |
| Plug-In Battery | 192.168.1.179, 192.168.1.170 |
| Water | 192.168.1.169 |

API v2 tokens: zie `FASE4.md`, `homewizard-fetch-tokens.py`.

## Redis (.14)

```env
# REDIS_URL=redis://192.168.1.14:6379
```

## Migratiescripts

Map `scripts/db-migration/` bevat **eenmalige** hulpscripts van de PHP→Next-migratie. Sommige verwijzen nog naar de oude host `192.168.1.52` (uitgefaseerd); gebruik ze alleen als historische referentie, niet voor dagelijks beheer.

Deploy naar productie: `deploy-next-pull.py`, `finish-deploy.py` (SSH naar `.32`).
