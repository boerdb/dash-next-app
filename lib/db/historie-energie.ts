import type { RowDataPacket } from "mysql2";
import type { EnergieHistorie } from "@/lib/api/types";
import { amsterdamSqlOffset } from "@/lib/energie/amsterdam-sql-offset";
import { buildHistorie24h } from "@/lib/energie/historie-24h";
import { getPool } from "@/lib/db/pool";

interface HourRow extends RowDataPacket {
  uur_key: string;
  gem_watt: number;
}

function query24h(offset: string): string {
  const ams = `CONVERT_TZ(meet_moment, '+00:00', '${offset}')`;
  return `
  SELECT
    DATE_FORMAT(${ams}, '%Y-%m-%d %H') AS uur_key,
    ROUND(AVG(actueel_vermogen_w), 0) AS gem_watt
  FROM energie_metingen
  WHERE meet_moment >= UTC_TIMESTAMP() - INTERVAL 24 HOUR
  GROUP BY uur_key
  ORDER BY MIN(meet_moment) ASC
`;
}

function queryFallback(offset: string): string {
  const ams = `CONVERT_TZ(meet_moment, '+00:00', '${offset}')`;
  return `
  SELECT uur_key, gem_watt FROM (
    SELECT
      DATE_FORMAT(${ams}, '%Y-%m-%d %H') AS uur_key,
      ROUND(AVG(actueel_vermogen_w), 0) AS gem_watt,
      MAX(meet_moment) AS laatste
    FROM energie_metingen
    GROUP BY uur_key
    ORDER BY laatste DESC
    LIMIT 24
  ) sub ORDER BY laatste ASC
`;
}

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
  const offset = amsterdamSqlOffset();
  const [rows] = await pool.query<HourRow[]>(query24h(offset));
  if (rows.length > 0) {
    return buildHistorie24h(rowsToMap(rows), currentWatt);
  }
  const [fallback] = await pool.query<HourRow[]>(queryFallback(offset));
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
