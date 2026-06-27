import type { WeerLive } from "@/lib/api/types";
import { hasLightningSensor } from "@/lib/weer/sensor-status";

/** WH57 dagteller (ontladingen vandaag). */
export function resolveDailyLightningCount(
  data: WeerLive
): number | undefined {
  if (data.lightning_num == null) return undefined;
  const n = Number(data.lightning_num);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

export function bliksemCountFromWeer(data: WeerLive): number {
  return resolveDailyLightningCount(data) ?? 0;
}

export function shouldSyncBliksemDag(data: WeerLive): boolean {
  if (!hasLightningSensor(data)) return false;
  return resolveDailyLightningCount(data) !== undefined;
}

/** Ook syncen bij dagwissel als gisteren WH57-data had (archive vóór reset). */
export function shouldPersistBliksemLive(
  live: WeerLive,
  previous: WeerLive | null = null
): boolean {
  if (shouldSyncBliksemDag(live)) return true;
  if (
    previous?.date_tracked &&
    live.date_tracked &&
    previous.date_tracked !== live.date_tracked &&
    shouldSyncBliksemDag(previous)
  ) {
    return true;
  }
  return false;
}

/** Bij dagwissel: vorige dag definitief archiveren, daarna vandaag syncen. */
export function bliksemDagSyncFromIngest(
  fresh: WeerLive,
  previous: WeerLive | null
): {
  archiveDag: string | null;
  archiveCount: number;
  vandaagDag: string;
  vandaagCount: number;
} {
  const vandaagDag = fresh.date_tracked ?? "";
  const vandaagCount = bliksemCountFromWeer(fresh);

  if (
    previous?.date_tracked &&
    vandaagDag &&
    previous.date_tracked !== vandaagDag
  ) {
    return {
      archiveDag: previous.date_tracked,
      archiveCount: bliksemCountFromWeer(previous),
      vandaagDag,
      vandaagCount,
    };
  }

  return {
    archiveDag: null,
    archiveCount: 0,
    vandaagDag,
    vandaagCount,
  };
}
