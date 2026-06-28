import type { RowDataPacket } from "mysql2";
import type { WeerLive } from "@/lib/api/types";
import { applyBaromTrend } from "@/lib/db/barom-trend";
import { enrichWeerLive } from "@/lib/weer/enrich-live";
import { resolveLightningStormRisk } from "@/lib/weer/lightning-storm";
import { getPool } from "@/lib/db/pool";
import { applyDbRainPeriodTotals } from "@/lib/db/weer-regen-store";
import { syncTodayBliksemFromLiveCache } from "@/lib/db/weer-bliksem-store";
import {
  maybeSupplementFromGateway,
  readWeerLiveCache,
} from "@/lib/db/weer-store";

interface MetingRow extends RowDataPacket {
  meet_moment: Date;
  temp_c: number;
  luchtvochtigheid: number;
  wind_kmh: number;
  wind_richting: number;
  regen_mm: number;
  zon_straling: number;
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

/** Live uit weer_live (Ecowitt ingest), anders laatste rij uit metingen. */
export async function fetchWeerLiveFromDb(): Promise<WeerLive> {
  await maybeSupplementFromGateway();
  void syncTodayBliksemFromLiveCache().catch((e) => {
    console.warn("weer_bliksem_dag live sync:", e);
  });
  const cached = await readWeerLiveCache();
  if (cached) {
    const withTrend = await applyBaromTrend(cached);
    const enriched = enrichWeerLive(withTrend);
    const withStorm = resolveLightningStormRisk(enriched, cached);
    return applyDbRainPeriodTotals(withStorm);
  }

  const fromMetingen = await fallbackFromMetingen();
  if (!fromMetingen) {
    throw new Error("Geen live weerdata (ingest of metingen)");
  }
  return enrichWeerLive(fromMetingen);
}
