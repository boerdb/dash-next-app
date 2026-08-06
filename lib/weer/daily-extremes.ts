import type { WeerLive } from "@/lib/api/types";
import { nowAmsterdamHHmm } from "@/lib/db/nl-time";
import { todayAmsterdamDate } from "@/lib/weer/regen-jaar-labels";
import { resolveIlluminanceLux } from "@/lib/weer/ws90-lux";

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

type ExtremeKeys = {
  min?: keyof WeerLive;
  max: keyof WeerLive;
  minTime?: keyof WeerLive;
  maxTime: keyof WeerLive;
};

function applyRange(
  data: WeerLive,
  previous: WeerLive | null,
  current: number | null,
  keys: ExtremeKeys,
  now: Date,
  today: string,
  maxOnly = false
): WeerLive {
  if (current == null) {
    if (!previous || previous.date_tracked !== today) return data;
    const out: WeerLive = { ...data };
    if (keys.min) out[keys.min] = previous[keys.min];
    out[keys.max] = previous[keys.max];
    if (keys.minTime) out[keys.minTime] = previous[keys.minTime] ?? null;
    out[keys.maxTime] = previous[keys.maxTime] ?? null;
    return out;
  }

  const curR = round1(current);
  const time = nowAmsterdamHHmm(now);
  const out: WeerLive = { ...data, date_tracked: today };

  if (!previous || previous.date_tracked !== today || previous[keys.max] == null) {
    if (!maxOnly && keys.min) out[keys.min] = curR;
    out[keys.max] = curR;
    if (!maxOnly && keys.minTime) out[keys.minTime] = time;
    out[keys.maxTime] = time;
    return out;
  }

  const prevMax = round1(Number(previous[keys.max]));
  let max = prevMax;
  let maxTime = (previous[keys.maxTime] as string | null | undefined) ?? time;

  if (curR > max) {
    max = curR;
    maxTime = time;
  }

  out[keys.max] = max;
  out[keys.maxTime] = maxTime;

  if (maxOnly || !keys.min || !keys.minTime) return out;

  const prevMin = round1(Number(previous[keys.min]));
  let min = prevMin;
  let minTime = (previous[keys.minTime] as string | null | undefined) ?? time;
  if (curR < min) {
    min = curR;
    minTime = time;
  }
  out[keys.min] = min;
  out[keys.minTime] = minTime;
  return out;
}

/** Dagelijkse min/max + tijdstip voor wind, vocht, druk, zon/UV en binnen. */
export function applyDailyExtremes(
  data: WeerLive,
  previous: WeerLive | null,
  now: Date = new Date()
): WeerLive {
  const today = todayAmsterdamDate(now);
  let out: WeerLive = { ...data, date_tracked: today };

  out = applyRange(
    out,
    previous,
    num(data.windspeed_kmh),
    { max: "maxdailywind_kmh", maxTime: "maxdailywind_time" },
    now,
    today,
    true
  );
  out = applyRange(
    out,
    previous,
    num(data.humidity),
    {
      min: "humidity_min",
      max: "humidity_max",
      minTime: "humidity_min_time",
      maxTime: "humidity_max_time",
    },
    now,
    today
  );
  out = applyRange(
    out,
    previous,
    num(data.baromrel_hpa),
    {
      min: "baromrel_min_hpa",
      max: "baromrel_max_hpa",
      minTime: "baromrel_min_time",
      maxTime: "baromrel_max_time",
    },
    now,
    today
  );
  out = applyRange(
    out,
    previous,
    num(data.baromabs_hpa),
    {
      min: "baromabs_min_hpa",
      max: "baromabs_max_hpa",
      minTime: "baromabs_min_time",
      maxTime: "baromabs_max_time",
    },
    now,
    today
  );
  out = applyRange(
    out,
    previous,
    num(data.solarradiation),
    { max: "solar_max", maxTime: "solar_max_time" },
    now,
    today,
    true
  );
  out = applyRange(
    out,
    previous,
    num(data.uv),
    { max: "uv_max", maxTime: "uv_max_time" },
    now,
    today,
    true
  );
  out = applyRange(
    out,
    previous,
    resolveIlluminanceLux(out) ?? null,
    { max: "illuminance_max", maxTime: "illuminance_max_time" },
    now,
    today,
    true
  );
  out = applyRange(
    out,
    previous,
    num(data.tempin_c),
    {
      min: "tempin_min_c",
      max: "tempin_max_c",
      minTime: "tempin_min_time",
      maxTime: "tempin_max_time",
    },
    now,
    today
  );
  out = applyRange(
    out,
    previous,
    num(data.humidityin),
    {
      min: "humidityin_min",
      max: "humidityin_max",
      minTime: "humidityin_min_time",
      maxTime: "humidityin_max_time",
    },
    now,
    today
  );

  return out;
}
