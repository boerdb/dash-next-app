import type { RowDataPacket } from "mysql2";
import type { WeerLive } from "@/lib/api/types";
import { env } from "@/lib/env.server";
import { enrichWeerLive } from "@/lib/weer/enrich-live";
import { getPool } from "@/lib/db/pool";
import { getCacheUpdatedAt, ingestWeerLive, readWeerLiveCache } from "@/lib/db/weer-store";
import { liveDataTime } from "@/lib/weer/live-data-time";

/** Sync DB-cache als data.json >1 min nieuwer is (Ecowitt nog op .52). */
const JSON_SYNC_AHEAD_MS = 60_000;

interface MetingRow extends RowDataPacket {
  meet_moment: Date;
  temp_c: number;
  luchtvochtigheid: number;
  wind_kmh: number;
  wind_richting: number;
  regen_mm: number;
  zon_straling: number;
}

function dataJsonUrl(): string {
  const base = env.WEER_API_BASE.replace(/\/$/, "");
  return `${base}/data.json`;
}

/** Overgang: data.json op PHP-host zolang Ecowitt daar nog naartoe stuurt. */
async function fetchStationJson(): Promise<WeerLive | null> {
  const res = await fetch(dataJsonUrl(), {
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) return null;
  return (await res.json()) as WeerLive;
}

async function fallbackFromMetingen(): Promise<WeerLive | null> {
  const pool = getPool();
  const [rows] = await pool.query<MetingRow[]>(
    `SELECT meet_moment, temp_c, luchtvochtigheid, wind_kmh, wind_richting, regen_mm, zon_straling
     FROM metingen ORDER BY meet_moment DESC LIMIT 1`
  );
  const row = rows[0];
  if (!row) return null;

  return {
    temp_c: Number(row.temp_c),
    humidity: row.luchtvochtigheid,
    windspd_avg10m_kmh: Number(row.wind_kmh),
    winddir: row.wind_richting,
    dailyrain_mm: Number(row.regen_mm),
    solarradiation: row.zon_straling,
    server_timestamp: new Date(row.meet_moment).toISOString(),
  };
}

export async function fetchWeerLiveFromDb(): Promise<WeerLive> {
  const [cached, updatedAt, stationJson] = await Promise.all([
    readWeerLiveCache(),
    getCacheUpdatedAt(),
    fetchStationJson(),
  ]);

  if (stationJson && !stationJson.server_timestamp && stationJson.dateutc) {
    stationJson.server_timestamp = String(stationJson.dateutc);
  }

  const cacheMs = cached ? liveDataTime(cached, updatedAt) : 0;
  const jsonMs = stationJson ? liveDataTime(stationJson, null) : 0;

  if (stationJson && jsonMs > cacheMs) {
    if (!cached || jsonMs > cacheMs + JSON_SYNC_AHEAD_MS) {
      return ingestWeerLive(stationJson);
    }
    return enrichWeerLive(stationJson);
  }

  if (cached) {
    return enrichWeerLive(cached);
  }

  const fromMetingen = await fallbackFromMetingen();
  if (!fromMetingen) {
    throw new Error("Geen live weerdata (ingest, json of metingen)");
  }
  return enrichWeerLive(fromMetingen);
}
