import type { WeerLive } from "@/lib/api/types";
import type { RuleMetric, RuleOperator } from "@/lib/tahoma/types";

export interface MetricMeta {
  key: RuleMetric;
  label: string;
  unit: string;
  /** Duidelijke drempel-suggesties voor de UI. */
  hint: string;
}

export const METRICS: MetricMeta[] = [
  { key: "windgust_kmh", label: "Windstoot (actueel)", unit: "km/u", hint: "Bescherming zonnescherm bijv. 35 km/u" },
  { key: "windspeed_kmh", label: "Windsnelheid (actueel)", unit: "km/u", hint: "Bijv. 25 km/u" },
  { key: "windspd_avg10m_kmh", label: "Wind gem. 10 min", unit: "km/u", hint: "Stabielere drempel, bijv. 30 km/u" },
  { key: "maxdailygust_kmh", label: "Hoogste windstoot vandaag", unit: "km/u", hint: "Bijv. 40 km/u" },
  { key: "solarradiation", label: "Zoninstraling", unit: "W/m²", hint: "Schaduw bijv. 600 W/m²" },
  { key: "uv", label: "UV-index", unit: "", hint: "Bijv. 6" },
  { key: "rainrate_mm", label: "Regenintensiteit", unit: "mm/u", hint: "Sluiten bij 0.5 mm/u" },
  { key: "dailyrain_mm", label: "Regen vandaag", unit: "mm", hint: "Bijv. 2 mm" },
  { key: "temp_c", label: "Temperatuur buiten", unit: "°C", hint: "Bijv. 25 °C" },
  { key: "humidity", label: "Luchtvochtigheid buiten", unit: "%", hint: "Bijv. 85 %" },
  { key: "baromrel_hpa", label: "Luchtdruk (rel)", unit: "hPa", hint: "Bijv. 1013 hPa" },
  { key: "lightning_km", label: "Bliksem-afstand", unit: "km", hint: "Sluiten binnen 8 km" },
  { key: "lightning_num", label: "Bliksem-inslagen vandaag", unit: "", hint: "Bijv. 1" },
  { key: "illuminance_lux", label: "Lichtsterkte (lux)", unit: "lux", hint: "Lamp aan bijv. < 30 lux" },
  { key: "lightning_storm_risk", label: "Onweerrisico", unit: "", hint: "Drempel 1 = actief" },
];

export const METRIC_BY_KEY: Record<RuleMetric, MetricMeta> = METRICS.reduce(
  (acc, m) => {
    acc[m.key] = m;
    return acc;
  },
  {} as Record<RuleMetric, MetricMeta>,
);

/** Lees een numerieke waarde uit WeerLive voor de opgegeven metric. */
export function metricValue(weather: WeerLive, metric: RuleMetric): number | null {
  if (metric === "lightning_storm_risk") {
    return weather.lightning_storm_risk ? 1 : 0;
  }
  const raw = weather[metric];
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function compare(value: number, op: RuleOperator, threshold: number): boolean {
  switch (op) {
    case ">":
      return value > threshold;
    case "<":
      return value < threshold;
    case ">=":
      return value >= threshold;
    case "<=":
      return value <= threshold;
  }
}

export function operatorLabel(op: RuleOperator): string {
  return { ">": "groter dan", "<": "kleiner dan", ">=": "minstens", "<=": "hoogstens" }[op];
}
