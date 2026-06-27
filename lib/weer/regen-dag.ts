import type { WeerLive } from "@/lib/api/types";
import { hasWs90Sensor } from "@/lib/weer/sensor-status";
import { round1 } from "@/lib/weer/regen-jaar-labels";

/** Dagregen (mm): WS90 piezo heeft voorrang als die sensor actief is. */
export function resolveDailyRainMm(data: WeerLive): number | undefined {
  if (hasWs90Sensor(data) && data.dailyrain_piezo_mm != null) {
    const piezo = Number(data.dailyrain_piezo_mm);
    if (Number.isFinite(piezo) && piezo >= 0) return piezo;
  }
  if (data.dailyrain_mm != null) {
    const mm = Number(data.dailyrain_mm);
    if (Number.isFinite(mm) && mm >= 0) return mm;
  }
  return undefined;
}

export function regenMmFromWeer(data: WeerLive): number {
  const mm = resolveDailyRainMm(data) ?? 0;
  return Number.isFinite(mm) && mm >= 0 ? round1(mm) : 0;
}

/** Bij dagwissel: vorige dag definitief uit cache, daarna vandaag syncen. */
export function regenDagSyncFromIngest(
  fresh: WeerLive,
  previous: WeerLive | null
): { archiveDag: string | null; archiveMm: number; vandaagDag: string; vandaagMm: number } {
  const vandaagDag = fresh.date_tracked ?? "";
  const vandaagMm = regenMmFromWeer(fresh);

  if (
    previous?.date_tracked &&
    vandaagDag &&
    previous.date_tracked !== vandaagDag
  ) {
    return {
      archiveDag: previous.date_tracked,
      archiveMm: regenMmFromWeer(previous),
      vandaagDag,
      vandaagMm,
    };
  }

  return {
    archiveDag: null,
    archiveMm: 0,
    vandaagDag,
    vandaagMm,
  };
}
