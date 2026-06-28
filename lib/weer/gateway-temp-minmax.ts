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
  const today = data.date_tracked ?? todayAmsterdamDate();
  const temp = num(data.temp_c);

  if (temp == null) {
    if (
      previous &&
      previous.date_tracked === today &&
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
      };
    }
    return data;
  }

  const tempR = round1(temp);
  const time = nowAmsterdamHHmm(now);
  const prevDay = previous?.date_tracked ?? null;
  const prevMin =
    previous?.temp_min_c != null ? round1(Number(previous.temp_min_c)) : null;
  const prevMax =
    previous?.temp_max_c != null ? round1(Number(previous.temp_max_c)) : null;

  if (prevDay !== today || prevMin == null || prevMax == null) {
    return {
      ...data,
      date_tracked: today,
      temp_min_c: tempR,
      temp_max_c: tempR,
      temp_min_time: time,
      temp_max_time: time,
    };
  }

  let min = prevMin;
  let max = prevMax;
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
  };
}
