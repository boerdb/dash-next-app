import type { WeerLive } from "@/lib/api/types";
import { round1 } from "@/lib/weer/regen-jaar-labels";

/** Dagregen (mm) uit standaard veld (WS90 piezo via applyWs90RainPrimary). */
export function resolveDailyRainMm(data: WeerLive): number | undefined {
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
