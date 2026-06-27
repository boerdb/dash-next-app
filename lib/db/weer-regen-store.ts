import type { RowDataPacket } from "mysql2";
import type { WeerLive, WeerRegenJaarMaand, WeerRegenJaarResponse } from "@/lib/api/types";
import { amsterdamSqlOffset } from "@/lib/energie/amsterdam-sql-offset";
import { getPool } from "@/lib/db/pool";
import { regenMmFromWeer } from "@/lib/weer/regen-dag";
import {
  currentJaarAmsterdam,
  jaarNavigatie,
  maandLabelShort,
  round1,
  todayAmsterdamDate,
} from "@/lib/weer/regen-jaar-labels";
import {
  overlayDbRainPeriodTotals,
  applyWs90RainPrimary,
} from "@/lib/weer/ws90-rain";

interface MaandRow extends RowDataPacket {
  maand: number;
  regen_mm: number;
}

interface DagRow extends RowDataPacket {
  dag: string;
  regen_mm: number;
}

interface TotaalRow extends RowDataPacket {
  totaal: number;
}

interface CachePayloadRow extends RowDataPacket {
  payload: string | WeerLive;
}

let lastBackfillAt = 0;
const backfillJaarAt = new Map<number, number>();

export async function upsertRegenDag(dag: string, regenMm: number): Promise<void> {
  if (!dag) return;
  const pool = getPool();
  await pool.query(
    `INSERT INTO weer_regen_dag (dag, regen_mm) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE regen_mm = GREATEST(regen_mm, VALUES(regen_mm))`,
    [dag, round1(regenMm)]
  );
}

export async function syncRegenFromIngest(
  archiveDag: string | null,
  archiveMm: number,
  vandaagDag: string,
  vandaagMm: number
): Promise<void> {
  if (archiveDag) {
    await upsertRegenDag(archiveDag, archiveMm);
  }
  if (vandaagDag) {
    await upsertRegenDag(vandaagDag, vandaagMm);
  }
}

/** Vul ontbrekende dagen uit metingen (MAX regen_mm per dag). */
export async function backfillRegenDagFromMetingen(
  van: string,
  tot: string
): Promise<number> {
  const pool = getPool();
  const offset = amsterdamSqlOffset();
  const ams = `CONVERT_TZ(meet_moment, '+00:00', '${offset}')`;

  const [rows] = await pool.query<DagRow[]>(
    `SELECT
       DATE_FORMAT(${ams}, '%Y-%m-%d') AS dag,
       ROUND(MAX(regen_mm), 1) AS regen_mm
     FROM metingen
     WHERE ${ams} >= ? AND ${ams} < DATE_ADD(?, INTERVAL 1 DAY)
     GROUP BY DATE_FORMAT(${ams}, '%Y-%m-%d')`,
    [van, tot]
  );

  for (const row of rows) {
    const mm = Number(row.regen_mm);
    if (mm <= 0) continue;
    await upsertRegenDag(row.dag, mm);
  }
  return rows.length;
}

/** Vul weer_regen_dag voor een kalenderjaar uit metingen (MAX per dag). */
export async function backfillRegenDagForJaar(jaar: number): Promise<void> {
  const now = Date.now();
  const last = backfillJaarAt.get(jaar) ?? 0;
  if (now - last < 3_600_000) return;
  backfillJaarAt.set(jaar, now);

  const vandaag = todayAmsterdamDate();
  const currentJaar = Number(vandaag.slice(0, 4));
  if (jaar > currentJaar) return;

  const van = `${jaar}-01-01`;
  const tot =
    jaar < currentJaar ? `${jaar}-12-31` : vandaag;

  try {
    await backfillRegenDagFromMetingen(van, tot);
  } catch (e) {
    console.warn("weer_regen_dag backfill jaar:", jaar, e);
  }
}

export async function maybeBackfillRegenDag(): Promise<void> {
  const now = Date.now();
  if (now - lastBackfillAt < 3_600_000) return;
  lastBackfillAt = now;
  await backfillRegenDagForJaar(currentJaarAmsterdam());
}

/** Sync vandaag uit weer_live-cache (piezo-dagregen) vóór maand/jaar-totalen. */
export async function syncTodayRegenFromLiveCache(): Promise<void> {
  const pool = getPool();
  const [rows] = await pool.query<CachePayloadRow[]>(
    "SELECT payload FROM weer_live WHERE id = 1 LIMIT 1"
  );
  const row = rows[0];
  if (!row) return;

  const raw =
    typeof row.payload === "string"
      ? (JSON.parse(row.payload) as WeerLive)
      : row.payload;
  const live = applyWs90RainPrimary(raw);
  const dag = live.date_tracked ?? todayAmsterdamDate();
  if (!dag) return;

  await upsertRegenDag(dag, regenMmFromWeer(live));
}

export async function fetchRegenMaandTotaal(
  jaar: number,
  maand: number
): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<TotaalRow[]>(
    `SELECT ROUND(COALESCE(SUM(regen_mm), 0), 1) AS totaal
     FROM weer_regen_dag
     WHERE YEAR(dag) = ? AND MONTH(dag) = ?`,
    [jaar, maand]
  );
  return round1(Number(rows[0]?.totaal ?? 0));
}

export async function fetchRegenJaarTotaal(jaar: number): Promise<number> {
  const totals = await fetchRegenMaandTotalen(jaar);
  let sum = 0;
  for (const v of totals.values()) sum += v;
  return round1(sum);
}

/** Maand/jaar uit DB i.p.v. WS90-gateway-tellers (combineert WH65-historie + piezo). */
export async function applyDbRainPeriodTotals(
  data: WeerLive
): Promise<WeerLive> {
  const vandaag = todayAmsterdamDate();
  const jaar = Number(vandaag.slice(0, 4));
  const maand = Number(vandaag.slice(5, 7));

  await syncTodayRegenFromLiveCache();
  await backfillRegenDagForJaar(jaar);

  const [maandMm, jaarMm] = await Promise.all([
    fetchRegenMaandTotaal(jaar, maand),
    fetchRegenJaarTotaal(jaar),
  ]);

  return overlayDbRainPeriodTotals(data, maandMm, jaarMm);
}

export async function fetchRegenMaandTotalen(
  jaar: number
): Promise<Map<number, number>> {
  const pool = getPool();
  const [rows] = await pool.query<MaandRow[]>(
    `SELECT MONTH(dag) AS maand, ROUND(SUM(regen_mm), 1) AS regen_mm
     FROM weer_regen_dag
     WHERE YEAR(dag) = ?
     GROUP BY MONTH(dag)`,
    [jaar]
  );
  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(Number(row.maand), Number(row.regen_mm));
  }
  return map;
}

export async function buildWeerRegenJaarResponse(
  jaar: number
): Promise<WeerRegenJaarResponse> {
  await syncTodayRegenFromLiveCache();
  await backfillRegenDagForJaar(jaar);
  const totals = await fetchRegenMaandTotalen(jaar);
  const currentJaar = currentJaarAmsterdam();
  const vandaag = todayAmsterdamDate();
  const currentMaand = Number(vandaag.slice(5, 7));

  const maanden: WeerRegenJaarMaand[] = [];
  let jaarTotaal = 0;

  for (let m = 1; m <= 12; m++) {
    let regen = totals.get(m) ?? 0;
    if (jaar > currentJaar || (jaar === currentJaar && m > currentMaand)) {
      regen = 0;
    }
    regen = round1(regen);
    jaarTotaal += regen;
    maanden.push({
      maand: m,
      label: maandLabelShort(m),
      regen_mm: regen,
    });
  }

  const nav = jaarNavigatie(jaar);
  return {
    jaar,
    maanden,
    jaar_totaal_mm: round1(jaarTotaal),
    vandaag,
    kan_vorige_jaar: nav.kan_vorige_jaar,
    kan_volgende_jaar: nav.kan_volgende_jaar,
  };
}
