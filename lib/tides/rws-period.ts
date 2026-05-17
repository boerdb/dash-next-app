import { allowedDayKeys } from "./allowed-days";
import { dagKeyAmsterdam } from "./day-label";

const TZ = "Europe/Amsterdam";

/** ISO 8601 met offset voor RWS WaterWebservices Periode-velden. */
export function rwsPeriodBounds(options?: {
  /** Extra dag vóór vandaag (voor vorige getij-hoogte). */
  includePriorDay?: boolean;
}): { begindatumtijd: string; einddatumtijd: string } {
  const keys = [...allowedDayKeys()].sort();
  let startKey = keys[0]!;
  const endKey = keys[keys.length - 1]!;

  if (options?.includePriorDay) {
    const noon = amsterdamWallTimeToDate(startKey, 12, 0, 0);
    noon.setTime(noon.getTime() - 86_400_000);
    startKey = dagKeyAmsterdam(noon);
  }

  return {
    begindatumtijd: toRwsIso(amsterdamWallTimeToDate(startKey, 0, 0, 0)),
    einddatumtijd: toRwsIso(amsterdamWallTimeToDate(endKey, 23, 59, 59)),
  };
}

function amsterdamWallTimeToDate(
  dagKey: string,
  hour: number,
  minute: number,
  second: number
): Date {
  const [y, m, d] = dagKey.split("-").map(Number);
  let guess = Date.UTC(y, m - 1, d, hour - 1, minute, second);

  for (let i = 0; i < 6; i++) {
    const p = amsterdamParts(guess);
    if (
      p.dagKey === dagKey &&
      p.hour === hour &&
      p.minute === minute &&
      p.second === second
    ) {
      return new Date(guess);
    }
    const secDiff =
      hour * 3600 +
      minute * 60 +
      second -
      (p.hour * 3600 + p.minute * 60 + p.second);
    guess += secDiff * 1000;
    if (p.dagKey < dagKey) guess += 86400_000;
    if (p.dagKey > dagKey) guess -= 86400_000;
  }

  return new Date(guess);
}

function amsterdamParts(utcMs: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));

  const pick = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const y = pick("year");
  const mo = pick("month");
  const d = pick("day");
  return {
    dagKey: `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    hour: pick("hour"),
    minute: pick("minute"),
    second: pick("second"),
  };
}

function toRwsIso(date: Date): string {
  const utcMs = date.getTime();
  const offsetMin = getAmsterdamOffsetMinutes(new Date(utcMs));
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, "0");
  const om = String(abs % 60).padStart(2, "0");

  const p = amsterdamParts(utcMs);
  return `${p.dagKey}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}:${String(p.second).padStart(2, "0")}.000${sign}${oh}:${om}`;
}

function getAmsterdamOffsetMinutes(at: Date): number {
  const tzName = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "shortOffset",
  })
    .formatToParts(at)
    .find((x) => x.type === "timeZoneName")?.value;

  const m = (tzName ?? "GMT+1").match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!m) return 60;
  const sign = m[1] === "+" ? 1 : -1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}
