import type { WeerLive } from "@/lib/api/types";
import { nowAmsterdamHHmm } from "@/lib/db/nl-time";

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Houdt het tijdstip (HH:MM, Amsterdam) bij waarop de hoogste daggust viel.
 * De GW1100 stuurt geen tijd mee bij maxdailygust, dus leiden we die zelf af:
 * de daggust is binnen een dag monotoon, dus elke verandering (nieuwe piek óf
 * de reset rond middernacht) markeert een nieuw tijdstip = nu.
 */
export function applyMaxGustTime(
  data: WeerLive,
  previous: WeerLive | null,
  now: Date = new Date()
): WeerLive {
  const cur = num(data.maxdailygust_kmh);
  if (cur == null) {
    const prevTime = previous?.maxdailygust_time;
    return prevTime != null ? { ...data, maxdailygust_time: prevTime } : data;
  }

  const prevMax = num(previous?.maxdailygust_kmh);
  const prevTime = previous?.maxdailygust_time ?? null;
  const changed = prevMax == null || cur !== prevMax;
  const time = changed || prevTime == null ? nowAmsterdamHHmm(now) : prevTime;
  return { ...data, maxdailygust_time: time };
}
