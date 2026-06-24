/** Meteorologische standaard: drukverandering over 3 uur (SYNOP/METAR). */
export const BAROM_TREND_HOURS = 3;

/** Minimale |Δ| in hPa om stijgend/dalend te tonen i.p.v. stabiel. */
export const BAROM_TREND_STEADY_THRESHOLD_HPA = 0.5;

export type BaromTrendDirection = "up" | "down" | "steady";

export interface BaromTrend {
  delta_hpa: number;
  hours: number;
  direction: BaromTrendDirection;
  label: string;
}

export function computeBaromTrend(
  currentHpa: number,
  pastHpa: number | null,
  hours = BAROM_TREND_HOURS
): BaromTrend | null {
  if (pastHpa == null || !Number.isFinite(currentHpa) || !Number.isFinite(pastHpa)) {
    return null;
  }
  const delta = Math.round((currentHpa - pastHpa) * 10) / 10;
  let direction: BaromTrendDirection = "steady";
  let label = "Stabiel";
  if (delta >= BAROM_TREND_STEADY_THRESHOLD_HPA) {
    direction = "up";
    label = "Stijgend";
  } else if (delta <= -BAROM_TREND_STEADY_THRESHOLD_HPA) {
    direction = "down";
    label = "Dalend";
  }
  return { delta_hpa: delta, hours, direction, label };
}

export function formatBaromTrendDelta(deltaHpa: number): string {
  const sign = deltaHpa > 0 ? "+" : "";
  return `${sign}${deltaHpa.toFixed(1)}`;
}
