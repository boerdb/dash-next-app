# Interne infrastructuur (thuisnetwerk)

| Host | Rol | Services |
|------|-----|----------|
| **192.168.1.52** | PHP / weer-API | Apache/Nginx, `api.php`, `historie.php`, `energie.php`, … |
| **192.168.1.14** | Data | **MariaDB** (`weerdata`, user `ben` vanaf `.52`), **Redis** |

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

- Praat alleen met PHP: `WEER_API_BASE=http://192.168.1.52`
- Zie `.env.example`

## Nog lokaal op .52 (niet op .14)

- `personen_db`, `ic_labels_db`
