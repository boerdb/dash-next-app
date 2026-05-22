import type { RowDataPacket } from "mysql2";
import type { EnergieHistorie } from "@/lib/api/types";
import { buildHistorie24h } from "@/lib/energie/historie-24h";
import { getPool } from "@/lib/db/pool";

interface HourRow extends RowDataPacket {
  uur_key: string;
  gem_watt: number;
}

const AMS_NOW = `CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'Europe/Amsterdam')`;

const QUERY_24H = `
  SELECT
    DATE_FORMAT(CONVERT_TZ(meet_moment, '+00:00', 'Europe/Amsterdam'), '%Y-%m-%d %H') AS uur_key,
    ROUND(AVG(actueel_vermogen_w), 0) AS gem_watt
  FROM energie_metingen
  WHERE meet_moment >= DATE_SUB(${AMS_NOW}, INTERVAL 24 HOUR)
  GROUP BY uur_key
  ORDER BY MIN(meet_moment) ASC
`;

const QUERY_FALLBACK = `
  SELECT uur_key, gem_watt FROM (
    SELECT
      DATE_FORMAT(CONVERT_TZ(meet_moment, '+00:00', 'Europe/Amsterdam'), '%Y-%m-%d %H') AS uur_key,
      ROUND(AVG(actueel_vermogen_w), 0) AS gem_watt,
      MAX(meet_moment) AS laatste
    FROM energie_metingen
    GROUP BY uur_key
    ORDER BY laatste DESC
    LIMIT 24
  ) sub ORDER BY laatste ASC
`;

function rowsToMap(rows: HourRow[]): Map<string, number> {
  const hourly = new Map<string, number>();
  for (const row of rows) {
    hourly.set(row.uur_key, Number(row.gem_watt));
  }
  return hourly;
}

export async function fetchEnergieHistorieFromDb(
  currentWatt?: number
): Promise<EnergieHistorie> {
  const pool = getPool();
  const [rows] = await pool.query<HourRow[]>(QUERY_24H);
  if (rows.length > 0) {
    return buildHistorie24h(rowsToMap(rows), currentWatt);
  }
  const [fallback] = await pool.query<HourRow[]>(QUERY_FALLBACK);
  return buildHistorie24h(rowsToMap(fallback), currentWatt);
}

export async function fetchLatestWattFromDb(): Promise<number | undefined> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT actueel_vermogen_w FROM energie_metingen ORDER BY meet_moment DESC LIMIT 1`
  );
  const w = rows[0]?.actueel_vermogen_w;
  return w != null ? Number(w) : undefined;
}
