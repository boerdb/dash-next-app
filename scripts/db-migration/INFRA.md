# Interne infrastructuur (thuisnetwerk)

| Host | Rol | Services |
|------|-----|----------|
| **192.168.1.52** | PHP | `/var/www/html/weer/`, `/personen/`, `/labels/` (zie README.txt per map) |
| **192.168.1.14** | Data | **MariaDB** (`weerdata`, `personen_db`, `ic_labels_db`, user `ben` vanaf `.52`), **Redis** |

## MariaDB (.14)

- Database weer/energie: `weerdata` (tabellen o.a. `metingen`, `energie_metingen`, `getijden`)
- Alleen bereikbaar vanaf PHP-host `.52` (geen directe DB-access vanuit Next.js)

## Redis (.14)

- Staat op dezelfde LXC als MariaDB
- Standaard poort: **6379**
- Deze Next-app gebruikt Redis **nog niet**; beschikbaar voor cache, sessies of PHP later

Voorbeeld URL (als je het later nodig hebt vanaf `.52` of een app-server op het LAN):

```env
# REDIS_URL=redis://192.168.1.14:6379
```

## Next.js dashboard

- Praat alleen met PHP: `WEER_API_BASE=http://192.168.1.52/weer`
- Personen/labels: `http://192.168.1.52/personen/…`, `http://192.168.1.52/labels/…`
- Zie `.env.example`

## MariaDB op .52

Alleen systeem-databases (`mysql`, `phpmyadmin`, …). Alle app-data staat op `.14`.

## Opgeruimd op .52

Oude PWA/test-bestanden staan in `/var/www/html/_archief/<datum>/` (script: `archive-52-clutter.py`).
