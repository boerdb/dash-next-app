import type { RowDataPacket } from "mysql2";
import type { WeerHistorie } from "@/lib/api/types";
import { getPool } from "@/lib/db/pool";

interface HourRow extends RowDataPacket {
  uur: string;
  gem_temp: number;
}

const QUERY_24H = `
  SELECT
    DATE_FORMAT(meet_moment, '%H:00') AS uur,
    ROUND(AVG(temp_c), 1) AS gem_temp
  FROM metingen
  WHERE meet_moment >= NOW() - INTERVAL 24 HOUR
  GROUP BY DATE(meet_moment), HOUR(meet_moment)
  ORDER BY meet_moment ASC
`;

const QUERY_FALLBACK = `
  SELECT uur, gem_temp FROM (
    SELECT
      DATE_FORMAT(meet_moment, '%H:00') AS uur,
      ROUND(AVG(temp_c), 1) AS gem_temp,
      MAX(meet_moment) AS laatste
    FROM metingen
    GROUP BY DATE(meet_moment), HOUR(meet_moment)
    ORDER BY laatste DESC
    LIMIT 24
  ) sub ORDER BY laatste ASC
`;

function rowsToHistorie(rows: HourRow[]): WeerHistorie {
  const labels: string[] = [];
  const temperatures: number[] = [];
  let totaal = 0;

  for (const row of rows) {
    labels.push(row.uur);
    const t = Number(row.gem_temp);
    temperatures.push(t);
    totaal += t;
  }

  const aantal = rows.length;
  return {
    labels,
    temperatures,
    gemiddelde: aantal > 0 ? Math.round((totaal / aantal) * 10) / 10 : 0,
  };
}

export async function fetchWeerHistorieFromDb(): Promise<WeerHistorie> {
  const pool = getPool();
  const [rows] = await pool.query<HourRow[]>(QUERY_24H);
  if (rows.length > 0) {
    return rowsToHistorie(rows);
  }
  const [fallback] = await pool.query<HourRow[]>(QUERY_FALLBACK);
  return rowsToHistorie(fallback);
}
