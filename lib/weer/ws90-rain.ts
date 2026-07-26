import type { WeerLive } from "@/lib/api/types";

/** WS90 piezo: 0,024 in/u ≈ 0,6 mm/u — minimum bij “regen ja”, geen echte intensiteit. */
export const PIEZO_RAINRATE_FLOOR_MM = 0.6;

function finiteMm(v: unknown): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function hourlyRainRateEstimate(data: WeerLive): number | undefined {
  return finiteMm(data.hourlyrain_mm) ?? finiteMm(data.hourlyrain_piezo_mm);
}

/** Piezo rain-rate die alleen “regen ja/nee” aangeeft (0,024 in/u). */
export function isPiezoRainRateFloor(mm: number): boolean {
  return Math.abs(mm - PIEZO_RAINRATE_FLOOR_MM) < 0.01;
}

function isStuckPiezoRainRate(data: WeerLive, rateMm: number): boolean {
  const raw = finiteMm(data.rrain_piezo);
  if (raw !== undefined && Math.abs(raw - 0.024) < 0.0001) return true;
  return isPiezoRainRateFloor(rateMm);
}

function resolveStuckPiezoRainRate(data: WeerLive, rateMm: number): number {
  if (!isStuckPiezoRainRate(data, rateMm)) return rateMm;

  const hourly = hourlyRainRateEstimate(data);
  if (hourly !== undefined && hourly > 0) return hourly;

  return 0;
}

/** WS90 piezo-regen aanwezig (oude WH65-regenmeter niet meer in gebruik). */
export function hasPiezoRain(data: WeerLive): boolean {
  return (
    finiteMm(data.dailyrain_piezo_mm) !== undefined ||
    finiteMm(data.rainrate_piezo_mm) !== undefined ||
    finiteMm(data.monthlyrain_piezo_mm) !== undefined ||
    finiteMm(data.yearlyrain_piezo_mm) !== undefined
  );
}

/**
 * Kopieert WS90 piezo naar de standaard regenvelden (dailyrain_mm, rainrate_mm, …).
 * Oude WH65-velden (dailyrainin e.d.) worden daarmee genegeerd in de UI.
 */
export function applyWs90RainPrimary(data: WeerLive): WeerLive {
  if (!hasPiezoRain(data)) return data;

  const out = { ...data };

  const daily = finiteMm(out.dailyrain_piezo_mm);
  if (daily !== undefined) out.dailyrain_mm = daily;

  const piezoRate = finiteMm(out.rainrate_piezo_mm);
  if (piezoRate !== undefined) out.rainrate_mm = piezoRate;

  const weekly = finiteMm(out.weeklyrain_piezo_mm);
  if (weekly !== undefined) out.weeklyrain_mm = weekly;

  const hourly = finiteMm(out.hourlyrain_piezo_mm);
  if (hourly !== undefined) out.hourlyrain_mm = hourly;

  const last24 = finiteMm(out.last24hrain_piezo_mm);
  if (last24 !== undefined) out.last24hrain_mm = last24;

  const monthly = finiteMm(out.monthlyrain_piezo_mm);
  if (monthly !== undefined) out.monthlyrain_mm = monthly;

  const yearly = finiteMm(out.yearlyrain_piezo_mm);
  if (yearly !== undefined) out.yearlyrain_mm = yearly;

  const rate = finiteMm(out.rainrate_mm);
  if (rate !== undefined) {
    const normalized = resolveStuckPiezoRainRate(out, rate);
    out.rainrate_mm = normalized;
    out.rainrate_piezo_mm = normalized;
  }

  return out;
}

/** Actuele neerslagintensiteit (mm/u); piezo-minimum wordt gecorrigeerd via uurtotaal. */
export function resolveRainRateMm(data: WeerLive): number | undefined {
  const fromStandard = finiteMm(data.rainrate_mm);
  if (fromStandard !== undefined) {
    return resolveStuckPiezoRainRate(data, fromStandard);
  }
  const fromPiezo = finiteMm(data.rainrate_piezo_mm);
  if (fromPiezo === undefined) return undefined;
  return resolveStuckPiezoRainRate(data, fromPiezo);
}

/**
 * WS90 piezo-tellers beginnen op nul; maand/jaar uit weer_regen_dag (WH65 + piezo per dag).
 */
export function overlayDbRainPeriodTotals(
  data: WeerLive,
  maandMm: number,
  jaarMm: number
): WeerLive {
  if (!hasPiezoRain(data)) return data;
  return {
    ...data,
    monthlyrain_mm: maandMm,
    yearlyrain_mm: jaarMm,
  };
}
