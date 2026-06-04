import type { RowDataPacket } from "mysql2";
import type {
  EnergieApiRaw,
  EnergieMaandDag,
  EnergieMaandResponse,
} from "@/lib/api/types";
import type { BatterijLive } from "@/lib/homewizard/battery";
import {
  computeDagTotalenKwh,
  type DagTotalenKwh,
} from "@/lib/energie/compute-dag-totalen";
import type { EnergieDagstart } from "@/lib/energie/dagstart";
import {
  dagLabelShort,
  isMaandToegestaan,
  maandDagRange,
  maandNavigatie,
  maandTitel,
  todayAmsterdamDate,
} from "@/lib/energie/maand-labels";
import { getPool } from "@/lib/db/pool";

export interface EnergieDagTotaalRow {
  dag: string;
  net_in_kwh: number;
  net_uit_kwh: number;
  batterij_kwh: number;
}

interface DagRow extends RowDataPacket {
  dag: Date | string;
  net_in_kwh: number;
  net_uit_kwh: number;
  batterij_kwh: number;
}

const RETENTION_MONTHS = 2;

let lastRetentionAt = 0;

export async function upsertDagTotalen(
  dag: string,
  totalen: DagTotalenKwh
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO energie_dag_totalen (dag, net_in_kwh, net_uit_kwh, batterij_kwh)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       net_in_kwh = VALUES(net_in_kwh),
       net_uit_kwh = VALUES(net_uit_kwh),
       batterij_kwh = VALUES(batterij_kwh)`,
    [
      dag,
      totalen.net_in_kwh,
      totalen.net_uit_kwh,
      totalen.batterij_kwh,
    ]
  );
}

export async function archiveDagFromDagstart(
  dag: string,
  start: EnergieDagstart,
  data: EnergieApiRaw,
  batterijen: BatterijLive[]
): Promise<void> {
  await upsertDagTotalen(dag, computeDagTotalenKwh(start, data, batterijen));
}

export async function purgeEnergieOuderDanTweeMaanden(): Promise<void> {
  const pool = getPool();
  await pool.query(
    `DELETE FROM energie_dag_totalen
     WHERE dag < DATE_SUB(CURDATE(), INTERVAL ? MONTH)`,
    [RETENTION_MONTHS]
  );
  await pool.query(
    `DELETE FROM energie_metingen
     WHERE meet_moment < UTC_TIMESTAMP() - INTERVAL ? MONTH`,
    [RETENTION_MONTHS]
  );
}

export async function maybePurgeEnergieRetention(): Promise<void> {
  const now = Date.now();
  if (now - lastRetentionAt < 3_600_000) return;
  lastRetentionAt = now;
  try {
    await purgeEnergieOuderDanTweeMaanden();
  } catch (e) {
    console.warn("energie retention purge:", e);
  }
}

function rowDagIso(dag: Date | string): string {
  if (typeof dag === "string") return dag.slice(0, 10);
  return dag.toISOString().slice(0, 10);
}

export async function fetchDagTotalenVoorMaand(
  jaar: number,
  maand: number
): Promise<Map<string, EnergieDagTotaalRow>> {
  const { van, tot } = maandDagRange(jaar, maand);
  const pool = getPool();
  const [rows] = await pool.query<DagRow[]>(
    `SELECT dag, net_in_kwh, net_uit_kwh, batterij_kwh
     FROM energie_dag_totalen
     WHERE dag >= ? AND dag < ?
     ORDER BY dag ASC`,
    [van, tot]
  );
  const map = new Map<string, EnergieDagTotaalRow>();
  for (const row of rows) {
    const dag = rowDagIso(row.dag);
    map.set(dag, {
      dag,
      net_in_kwh: Number(row.net_in_kwh),
      net_uit_kwh: Number(row.net_uit_kwh),
      batterij_kwh: Number(row.batterij_kwh),
    });
  }
  return map;
}

function dagenInMaand(jaar: number, maand: number): string[] {
  const last = new Date(jaar, maand, 0).getDate();
  const mm = String(maand).padStart(2, "0");
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    out.push(`${jaar}-${mm}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

export async function buildEnergieMaandResponse(
  jaar: number,
  maand: number,
  liveVandaag?: DagTotalenKwh | null
): Promise<EnergieMaandResponse | null> {
  if (!isMaandToegestaan(jaar, maand)) return null;

  const vandaag = todayAmsterdamDate();
  const stored = await fetchDagTotalenVoorMaand(jaar, maand);
  const prefix = `${jaar}-${String(maand).padStart(2, "0")}`;
  const todayInMonth = vandaag.startsWith(prefix);

  const dagen: EnergieMaandDag[] = dagenInMaand(jaar, maand).map((dag) => {
    const row =
      todayInMonth && dag === vandaag && liveVandaag
        ? liveVandaag
        : stored.get(dag);
    return {
      dag,
      label: dagLabelShort(dag),
      net_in_kwh: row?.net_in_kwh ?? 0,
      net_uit_kwh: row?.net_uit_kwh ?? 0,
      batterij_kwh: row?.batterij_kwh ?? 0,
    };
  });

  const nav = maandNavigatie(jaar, maand, vandaag);

  return {
    jaar,
    maand,
    maand_label: maandTitel(jaar, maand),
    dagen,
    vandaag,
    ...nav,
  };
}
