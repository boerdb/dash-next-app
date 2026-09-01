import type { WeerLive } from "@/lib/api/types";
import { round1 } from "@/lib/weer/regen-jaar-labels";

/** Dagregen (mm): WH40 kiepbakje, anders piezo via applyWs90RainPrimary. */
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

/** Kalenderdag vóór een Amsterdam YYYY-MM-DD. */
export function previousAmsterdamDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

/**
 * Na middernacht staat de sensor-teller soms nog op gisterens totaal.
 * Trek dan het vorige dagsaldo af, of 0 als de teller nog niet gereset is.
 */
export function todayRainMmAfterDayChange(
  fresh: WeerLive,
  previous: WeerLive
): number {
  const freshMm = regenMmFromWeer(fresh);
  const prevMm = regenMmFromWeer(previous);
  if (freshMm < prevMm) return freshMm;
  return round1(Math.max(0, freshMm - prevMm));
}

/** Live-cache sync: teller staat soms nog exact op gisterens totaal. */
export function correctStaleTodayRainFromYesterday(
  fresh: WeerLive,
  yesterdayMm: number
): number {
  const freshMm = regenMmFromWeer(fresh);
  if (yesterdayMm > 0 && freshMm === yesterdayMm) {
    return 0;
  }
  return freshMm;
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
      vandaagMm: todayRainMmAfterDayChange(fresh, previous),
    };
  }

  return {
    archiveDag: null,
    archiveMm: 0,
    vandaagDag,
    vandaagMm,
  };
}
