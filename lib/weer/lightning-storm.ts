import type { WeerLive } from "@/lib/api/types";
import { isRecentLightningStrike } from "@/lib/weer/lightning-time";

const WH57_MAX_KM = 40;

function fieldPresent(data: WeerLive, key: keyof WeerLive): boolean {
  const v = data[key];
  return v !== undefined && v !== "";
}

/** Recente inslag binnen WH57-bereik. */
export function isRecentLightningStrikeNearby(data: WeerLive): boolean {
  const km = data.lightning_km;
  if (km == null || km <= 0 || km > WH57_MAX_KM) return false;
  return isRecentLightningStrike(data.lightning_time ?? undefined);
}

/**
 * Onweersfront / kans op onweer zonder bevestigde inslag.
 * GW1100 kan afstand melden vóórdat lightning_time gezet is.
 */
export function isLightningStormFront(data: WeerLive): boolean {
  const km = data.lightning_km;
  if (km == null || km <= 0 || km > WH57_MAX_KM) return false;
  if (data.lightning_time) return false;
  return fieldPresent(data, "wh57batt");
}

/** Console-achtige stormvoorspelling uit dalende druk + warm vochtig weer. */
export function isBarometerStormForecast(data: WeerLive): boolean {
  if (data.barom_trend_direction !== "down") return false;
  const delta = Number(data.barom_trend_delta_hpa);
  const temp = Number(data.temp_c);
  const humidity = Number(data.humidity);
  if (!Number.isFinite(delta) || delta > -0.8) return false;
  if (!Number.isFinite(temp) || temp < 24) return false;
  if (!Number.isFinite(humidity) || humidity < 45) return false;
  return fieldPresent(data, "wh57batt");
}

export function computeLightningStormRisk(data: WeerLive): boolean {
  if (isRecentLightningStrikeNearby(data)) return true;
  if (isLightningStormFront(data)) return true;
  if (isBarometerStormForecast(data)) return true;
  return false;
}

export function pickBestLightningFields(
  ...sources: WeerLive[]
): Partial<WeerLive> {
  let best: WeerLive | null = null;
  let bestScore = -1;

  for (const source of sources) {
    let score = 0;
    const km = source.lightning_km;
    if (km != null && km > 0) score += 20;
    if (source.lightning_time) score += 10;
    if (source.lightning_num != null && source.lightning_num > 0) score += 5;
    if (fieldPresent(source, "wh57batt")) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = source;
    }
  }

  if (!best) return {};

  return {
    lightning_km: best.lightning_km,
    lightning_num: best.lightning_num,
    lightning_time: best.lightning_time,
    lightning_time_raw: best.lightning_time_raw,
    lightning: best.lightning as string | undefined,
    wh57batt: best.wh57batt,
  };
}

export type LightningStatusKind = "strike" | "risk" | "idle";

export type LightningRiskReason = "strike" | "storm_front" | "barometer" | null;

export function getLightningRiskReason(data: WeerLive): LightningRiskReason {
  if (isRecentLightningStrikeNearby(data)) return "strike";
  if (isLightningStormFront(data)) return "storm_front";
  if (isBarometerStormForecast(data)) return "barometer";
  return null;
}

export function getLightningStatus(data: WeerLive): LightningStatusKind {
  if (isRecentLightningStrikeNearby(data)) return "strike";
  if (computeLightningStormRisk(data)) return "risk";
  return "idle";
}

export function getLightningStatusLabel(data: WeerLive): string {
  const reason = getLightningRiskReason(data);
  if (reason === "strike") return "Recente inslag gedetecteerd";
  if (reason === "storm_front") return "WH57 detecteert onweersfront";
  if (reason === "barometer") return "Kans op onweer (barometer)";
  return "WH57 actief · geen inslagen";
}
