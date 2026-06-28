import type { WeerLive } from "@/lib/api/types";
import { nowAmsterdamHHmm } from "@/lib/db/nl-time";

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Houdt het tijdstip (HH:MM, Amsterdam) bij waarop de hoogste daggust viel.
 * De GW1100 stuurt geen tijd mee bij maxdailygust, dus leiden we die zelf af.
 * Tijd wordt alleen gezet bij een nieuwe piek (hoger) of dag-reset (lager);
 * kleine verschillen tussen gateway/ingest (20.1 vs 20.2) mogen de klok niet laten lopen.
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

  const curR = round1(cur);
  const prevMaxR =
    previous?.maxdailygust_kmh != null
      ? round1(Number(previous.maxdailygust_kmh))
      : null;
  const prevTime = previous?.maxdailygust_time ?? null;

  // Eerste waarde of nieuwe piek vandaag
  if (prevMaxR == null || curR > prevMaxR) {
    return { ...data, maxdailygust_time: nowAmsterdamHHmm(now) };
  }

  // Dag-reset rond middernacht (daggust daalt)
  if (curR < prevMaxR) {
    return { ...data, maxdailygust_time: nowAmsterdamHHmm(now) };
  }

  // Zelfde piek: tijd bevriezen (eenmalig invullen als die nog ontbreekt)
  return {
    ...data,
    maxdailygust_time: prevTime ?? nowAmsterdamHHmm(now),
  };
}
