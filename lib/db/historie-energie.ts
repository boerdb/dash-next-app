import type { RowDataPacket } from "mysql2";
import type { EnergieHistorie } from "@/lib/api/types";
import { getPool } from "@/lib/db/pool";

interface HourRow extends RowDataPacket {
  uur: string;
  gem_watt: number;
}

const QUERY_24H = `
  SELECT
    DATE_FORMAT(meet_moment, '%H:00') AS uur,
    ROUND(AVG(actueel_vermogen_w), 0) AS gem_watt
  FROM energie_metingen
  WHERE meet_moment >= NOW() - INTERVAL 24 HOUR
  GROUP BY DATE(meet_moment), HOUR(meet_moment)
  ORDER BY meet_moment ASC
`;

const QUERY_FALLBACK = `
  SELECT uur, gem_watt FROM (
    SELECT
      DATE_FORMAT(meet_moment, '%H:00') AS uur,
      ROUND(AVG(actueel_vermogen_w), 0) AS gem_watt,
      MAX(meet_moment) AS laatste
    FROM energie_metingen
    GROUP BY DATE(meet_moment), HOUR(meet_moment)
    ORDER BY laatste DESC
    LIMIT 24
  ) sub ORDER BY laatste ASC
`;

function rowsToHistorie(rows: HourRow[]): EnergieHistorie {
  const labels: string[] = [];
  const wattage: number[] = [];
  let totaal = 0;

  for (const row of rows) {
    labels.push(row.uur);
    const w = Number(row.gem_watt);
    wattage.push(w);
    totaal += w;
  }

  const aantal = rows.length;
  return {
    labels,
    wattage,
    gemiddelde: aantal > 0 ? Math.round(totaal / aantal) : 0,
  };
}

export async function fetchEnergieHistorieFromDb(): Promise<EnergieHistorie> {
  const pool = getPool();
  const [rows] = await pool.query<HourRow[]>(QUERY_24H);
  if (rows.length > 0) {
    return rowsToHistorie(rows);
  }
  const [fallback] = await pool.query<HourRow[]>(QUERY_FALLBACK);
  return rowsToHistorie(fallback);
}
