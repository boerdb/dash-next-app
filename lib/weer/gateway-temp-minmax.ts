import type { WeerLive } from "@/lib/api/types";
import { nowAmsterdamHHmm } from "@/lib/db/nl-time";
import { todayAmsterdamDate } from "@/lib/weer/regen-jaar-labels";

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function stripOutdoorTempMinMax(data: WeerLive): WeerLive {
  const {
    temp_min_c: _min,
    temp_max_c: _max,
    temp_min_time: _minTime,
    temp_max_time: _maxTime,
    temp_minmax_date: _day,
    ...rest
  } = data;
  return rest;
}

/** Buiten-min/max hoort bij vandaag; oude caches missen temp_minmax_date. */
function shouldResetOutdoorTempMinMax(
  previous: WeerLive | null,
  today: string,
  now: Date
): boolean {
  if (!previous) return true;
  if (previous.temp_min_c == null || previous.temp_max_c == null) return true;

  const minMaxDay = previous.temp_minmax_date ?? previous.date_tracked ?? null;
  if (minMaxDay !== today) return true;

  if (previous.temp_minmax_date) return false;

  const nowTime = nowAmsterdamHHmm(now);
  const minTime = previous.temp_min_time;
  const maxTime = previous.temp_max_time;
  return Boolean(minTime && maxTime && minTime > nowTime && maxTime > nowTime);
}

function initOutdoorTempMinMax(
  data: WeerLive,
  tempR: number,
  today: string,
  now: Date
): WeerLive {
  const time = nowAmsterdamHHmm(now);
  return {
    ...data,
    date_tracked: today,
    temp_min_c: tempR,
    temp_max_c: tempR,
    temp_min_time: time,
    temp_max_time: time,
    temp_minmax_date: today,
  };
}

/**
 * Min/max vandaag bijhouden uit GW1100-polls (temp_c). De gateway-API heeft geen
 * dag-min/max-velden (alleen actuele buitentemp 0x02), net als maxdailygust.
 * Tijd wordt gezet zodra min of max verandert; daarna bevroren tot middernacht.
 */
export function applyGatewayTempMinMax(
  data: WeerLive,
  previous: WeerLive | null,
  now: Date = new Date()
): WeerLive {
  const today = todayAmsterdamDate(now);
  const temp = num(data.temp_c);

  if (temp == null) {
    if (
      previous &&
      !shouldResetOutdoorTempMinMax(previous, today, now) &&
      previous.temp_min_c != null &&
      previous.temp_max_c != null
    ) {
      return {
        ...data,
        date_tracked: today,
        temp_min_c: previous.temp_min_c,
        temp_max_c: previous.temp_max_c,
        temp_min_time: previous.temp_min_time ?? null,
        temp_max_time: previous.temp_max_time ?? null,
        temp_minmax_date: previous.temp_minmax_date ?? today,
      };
    }
    return data;
  }

  const tempR = round1(temp);
  const time = nowAmsterdamHHmm(now);
  const prevMin =
    previous?.temp_min_c != null ? round1(Number(previous.temp_min_c)) : null;
  const prevMax =
    previous?.temp_max_c != null ? round1(Number(previous.temp_max_c)) : null;

  if (shouldResetOutdoorTempMinMax(previous, today, now)) {
    return initOutdoorTempMinMax(data, tempR, today, now);
  }

  let min = prevMin!;
  let max = prevMax!;
  let minTime = previous?.temp_min_time ?? time;
  let maxTime = previous?.temp_max_time ?? time;
  if (tempR < min) {
    min = tempR;
    minTime = time;
  }
  if (tempR > max) {
    max = tempR;
    maxTime = time;
  }

  return {
    ...data,
    date_tracked: today,
    temp_min_c: min,
    temp_max_c: max,
    temp_min_time: minTime,
    temp_max_time: maxTime,
    temp_minmax_date: today,
  };
}

/** Behoud min/max bij Ecowitt-ingest; alleen gateway-polls mogen bijwerken. */
export function carryForwardTempMinMax(
  data: WeerLive,
  previous: WeerLive | null,
  now: Date = new Date()
): WeerLive {
  const today = todayAmsterdamDate(now);
  const temp = num(data.temp_c);

  if (shouldResetOutdoorTempMinMax(previous, today, now)) {
    const cleaned = stripOutdoorTempMinMax(data);
    if (temp != null) {
      return initOutdoorTempMinMax(cleaned, round1(temp), today, now);
    }
    return { ...cleaned, date_tracked: today };
  }

  return {
    ...stripOutdoorTempMinMax(data),
    date_tracked: today,
    temp_min_c: previous!.temp_min_c,
    temp_max_c: previous!.temp_max_c,
    temp_min_time: previous!.temp_min_time ?? null,
    temp_max_time: previous!.temp_max_time ?? null,
    temp_minmax_date: previous!.temp_minmax_date ?? today,
  };
}
