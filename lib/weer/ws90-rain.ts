import type { WeerLive } from "@/lib/api/types";

function finiteMm(v: unknown): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
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

  const rate = finiteMm(out.rainrate_piezo_mm);
  if (rate !== undefined) out.rainrate_mm = rate;

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

  return out;
}
