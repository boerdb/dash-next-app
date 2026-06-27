import type { RowDataPacket } from "mysql2";
import type {
  WeerBliksemJaarMaand,
  WeerBliksemJaarResponse,
  WeerLive,
} from "@/lib/api/types";
import { getPool } from "@/lib/db/pool";
import { bliksemCountFromWeer, shouldSyncBliksemDag } from "@/lib/weer/bliksem-dag";
import {
  currentJaarAmsterdam,
  jaarNavigatie,
  maandLabelShort,
  todayAmsterdamDate,
} from "@/lib/weer/regen-jaar-labels";

interface MaandRow extends RowDataPacket {
  maand: number;
  ontadingen: number;
}

interface CachePayloadRow extends RowDataPacket {
  payload: string | WeerLive;
}

export async function upsertBliksemDag(
  dag: string,
  ontadingen: number
): Promise<void> {
  if (!dag) return;
  const count = Math.max(0, Math.round(ontadingen));
  const pool = getPool();
  await pool.query(
    `INSERT INTO weer_bliksem_dag (dag, ontadingen) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE ontadingen = GREATEST(ontadingen, VALUES(ontadingen))`,
    [dag, count]
  );
}

export async function syncBliksemFromIngest(
  archiveDag: string | null,
  archiveCount: number,
  vandaagDag: string,
  vandaagCount: number
): Promise<void> {
  if (archiveDag) {
    await upsertBliksemDag(archiveDag, archiveCount);
  }
  if (vandaagDag) {
    await upsertBliksemDag(vandaagDag, vandaagCount);
  }
}

export async function syncTodayBliksemFromLiveCache(): Promise<void> {
  const pool = getPool();
  const [rows] = await pool.query<CachePayloadRow[]>(
    "SELECT payload FROM weer_live WHERE id = 1 LIMIT 1"
  );
  const row = rows[0];
  if (!row) return;

  const live =
    typeof row.payload === "string"
      ? (JSON.parse(row.payload) as WeerLive)
      : row.payload;
  const dag = live.date_tracked ?? todayAmsterdamDate();
  if (!dag) return;

  if (!shouldSyncBliksemDag(live)) return;
  await upsertBliksemDag(dag, bliksemCountFromWeer(live));
}

export async function fetchBliksemMaandTotalen(
  jaar: number
): Promise<Map<number, number>> {
  const pool = getPool();
  const [rows] = await pool.query<MaandRow[]>(
    `SELECT MONTH(dag) AS maand, SUM(ontadingen) AS ontadingen
     FROM weer_bliksem_dag
     WHERE YEAR(dag) = ?
     GROUP BY MONTH(dag)`,
    [jaar]
  );
  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(Number(row.maand), Number(row.ontadingen));
  }
  return map;
}

export async function buildWeerBliksemJaarResponse(
  jaar: number
): Promise<WeerBliksemJaarResponse> {
  await syncTodayBliksemFromLiveCache();
  const totals = await fetchBliksemMaandTotalen(jaar);
  const currentJaar = currentJaarAmsterdam();
  const vandaag = todayAmsterdamDate();
  const currentMaand = Number(vandaag.slice(5, 7));

  const maanden: WeerBliksemJaarMaand[] = [];
  let jaarTotaal = 0;

  for (let m = 1; m <= 12; m++) {
    let count = totals.get(m) ?? 0;
    if (jaar > currentJaar || (jaar === currentJaar && m > currentMaand)) {
      count = 0;
    }
    jaarTotaal += count;
    maanden.push({
      maand: m,
      label: maandLabelShort(m),
      ontadingen: count,
    });
  }

  const nav = jaarNavigatie(jaar);
  return {
    jaar,
    maanden,
    jaar_totaal: jaarTotaal,
    vandaag,
    kan_vorige_jaar: nav.kan_vorige_jaar,
    kan_volgende_jaar: nav.kan_volgende_jaar,
  };
}
